import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, Package, Zap, CreditCard, Euro, Clock,
  ChevronRight, Check, X, Plus, RefreshCw, Gift, Layers,
  Filter, Star, Briefcase, Flag, Trophy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { Product, DigitalProduct, PhysicalProduct, ServiceProduct, ProductBundle } from '@/api/entities';
import { useUser } from '@/components/context/UserContext';

function formatPrice(amount, currency = 'EUR') {
  if (!amount && amount !== 0) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

/**
 * Convert a product + optional pricing selection into a line item
 */
function createLineItem(product, details, selection = {}) {
  const isDigital = product.type === 'digital';
  const isService = product.type === 'service';
  const basePrice = isService
    ? getServiceBasePrice(details)
    : (details?.pricing?.base_price || product.price || 0);

  // Default line item from product
  const lineItem = {
    product_id: product.id,
    product_type: product.type,
    name: product.name,
    description: product.short_description || '',
    sku: product.sku || '',
    quantity: 1,
    unit_price: basePrice,
    is_subscription: false,
    plan_id: null,
    plan_name: null,
    billing_cycle: null,
    add_ons: []
  };

  // If it's a digital product with subscription plan selected
  if (isDigital && selection.plan) {
    const plan = selection.plan;
    const cycle = selection.billing_cycle || 'monthly';
    const pricing = plan.pricing?.[cycle] || {};

    lineItem.is_subscription = true;
    lineItem.plan_id = plan.id;
    lineItem.plan_name = plan.name;
    lineItem.billing_cycle = cycle;
    lineItem.unit_price = pricing.amount || 0;
    lineItem.description = `${product.name} - ${plan.name} (${cycle})`;
  }

  // If one-time service selected
  if (isDigital && selection.oneTimeItem) {
    const item = selection.oneTimeItem;
    lineItem.is_subscription = false;
    lineItem.plan_id = null;
    lineItem.unit_price = item.amount || 0;
    lineItem.description = `${product.name} - ${item.name}`;
  }

  // Service product pricing
  if (isService && selection.servicePricing) {
    const sp = selection.servicePricing;
    lineItem.unit_price = sp.unit_price || 0;
    lineItem.quantity = sp.quantity || 1;
    lineItem.is_subscription = sp.is_subscription || false;
    lineItem.billing_cycle = sp.billing_cycle || null;
    lineItem.description = sp.description || product.short_description || '';

    // Store service-specific metadata
    lineItem.service_pricing_model = sp.pricing_model;
    if (sp.milestone_id) lineItem.milestone_id = sp.milestone_id;
    if (sp.project_item_id) lineItem.project_item_id = sp.project_item_id;
  }

  // Add-ons
  if (selection.addOns?.length > 0) {
    lineItem.add_ons = selection.addOns.map(addon => ({
      addon_id: addon.id,
      name: addon.name,
      unit_price: addon.pricing?.monthly?.amount || addon.pricing?.one_time?.amount || 0,
      is_subscription: addon.pricing_type === 'subscription'
    }));
  }

  return lineItem;
}

const SERVICE_PRICING_LABELS = {
  hourly: 'Hourly',
  retainer: 'Retainer',
  project: 'Project',
  milestone: 'Milestone',
  success_fee: 'Success Fee',
  hybrid: 'Hybrid',
};

function getServiceBasePrice(details) {
  if (!details?.pricing_config) return 0;
  const config = details.pricing_config;
  const model = details.pricing_model;

  if (model === 'hourly' && config.hourly?.rate) return config.hourly.rate;
  if (model === 'retainer' && config.retainer?.monthly_fee) return config.retainer.monthly_fee;
  if (model === 'project' && config.project?.items?.length > 0) {
    return config.project.items.reduce((sum, item) => sum + (item.price || 0), 0);
  }
  if (model === 'milestone' && config.milestones?.items?.length > 0) {
    return config.milestones.items.reduce((sum, item) => sum + (item.amount || 0), 0);
  }
  if (model === 'success_fee') return config.success_fee?.base_fee || 0;
  // hybrid: use first enabled model
  if (model === 'hybrid') {
    if (config.hourly?.enabled && config.hourly?.rate) return config.hourly.rate;
    if (config.retainer?.enabled && config.retainer?.monthly_fee) return config.retainer.monthly_fee;
    if (config.project?.enabled && config.project?.items?.length > 0) {
      return config.project.items.reduce((sum, item) => sum + (item.price || 0), 0);
    }
  }
  return 0;
}

function getServicePriceLabel(details) {
  const model = details?.pricing_model;
  if (model === 'hourly') return '/hr';
  if (model === 'retainer') return '/mo';
  if (model === 'project') return 'total';
  if (model === 'milestone') return 'total';
  if (model === 'success_fee') return 'base';
  return '';
}

function ProductCard({ product, details, currency, onSelect, isSelected, ft }) {
  const isDigital = product.type === 'digital';
  const isService = product.type === 'service';
  const basePrice = isService
    ? getServiceBasePrice(details)
    : (details?.pricing?.base_price || product.price || 0);
  const hasSubscription = details?.pricing_config?.subscriptions?.enabled;
  const hasOneTime = details?.pricing_config?.one_time?.enabled;
  const hasAddOns = details?.pricing_config?.add_ons?.enabled;
  const isDraft = product.status === 'draft';

  const iconClass = isDigital
    ? "bg-cyan-500/10 border border-cyan-500/30"
    : isService
      ? "bg-blue-500/10 border border-blue-500/30"
      : "bg-blue-500/10 border border-blue-500/30";

  const iconElement = isDigital
    ? <Zap className="w-5 h-5 text-cyan-400" />
    : isService
      ? <Briefcase className="w-5 h-5 text-blue-400" />
      : <Package className="w-5 h-5 text-blue-400" />;

  return (
    <div
      className={cn(
        "p-4 rounded-xl border transition-all cursor-pointer group",
        isSelected
          ? "bg-cyan-500/10 border-cyan-500/30"
          : ft("bg-slate-100 border-slate-200 hover:border-slate-300", "bg-zinc-900/50 border-white/10 hover:border-white/20")
      )}
      onClick={() => onSelect(product, details)}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
          iconClass
        )}>
          {iconElement}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={`font-medium ${ft('text-slate-900', 'text-white')} truncate`}>{product.name}</h4>
            {isDraft && (
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${ft('bg-slate-200 text-slate-500 border-slate-300', 'bg-zinc-800 text-zinc-400 border-zinc-700')}`}>
                Draft
              </Badge>
            )}
            {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
          </div>
          {product.sku && (
            <p className={`text-xs ${ft('text-slate-400', 'text-zinc-500')}`}>SKU: {product.sku}</p>
          )}
          {product.short_description && (
            <p className={`text-sm ${ft('text-slate-500', 'text-zinc-400')} line-clamp-1 mt-1`}>
              {product.short_description}
            </p>
          )}

          {/* Pricing badges for digital products */}
          {isDigital && (
            <div className="flex items-center gap-2 mt-2">
              {hasSubscription && (
                <Badge variant="outline" className="text-xs bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Subscription
                </Badge>
              )}
              {hasOneTime && (
                <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30">
                  <Zap className="w-3 h-3 mr-1" />
                  One-time
                </Badge>
              )}
              {hasAddOns && (
                <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/30">
                  <Gift className="w-3 h-3 mr-1" />
                  Add-ons
                </Badge>
              )}
            </div>
          )}

          {/* Pricing badges for service products */}
          {isService && details && (
            <div className="flex items-center gap-2 mt-2">
              {details.pricing_model && (
                <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30">
                  <Clock className="w-3 h-3 mr-1" />
                  {SERVICE_PRICING_LABELS[details.pricing_model] || details.pricing_model}
                </Badge>
              )}
              {details.service_type && (
                <Badge variant="outline" className="text-xs bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
                  {details.service_type.charAt(0).toUpperCase() + details.service_type.slice(1)}
                </Badge>
              )}
              {details.sla && Object.values(details.sla).some(v => v) && (
                <Badge variant="outline" className="text-xs bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
                  SLA
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Price */}
        <div className="text-right flex-shrink-0">
          <div className={`text-lg font-semibold ${ft('text-slate-900', 'text-white')}`}>
            {formatPrice(basePrice, currency)}
          </div>
          {isService ? (
            <p className={`text-xs ${ft('text-slate-400', 'text-zinc-500')}`}>{getServicePriceLabel(details)}</p>
          ) : !isDigital ? (
            <p className={`text-xs ${ft('text-slate-400', 'text-zinc-500')}`}>Base price</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DigitalPricingSelector({ product, details, currency, onConfirm, onCancel, ft }) {
  const [selectedType, setSelectedType] = useState('subscription');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedCycle, setSelectedCycle] = useState('monthly');
  const [selectedOneTime, setSelectedOneTime] = useState(null);
  const [selectedAddOns, setSelectedAddOns] = useState([]);

  const pricingConfig = details?.pricing_config || {};
  const hasSubscription = pricingConfig.subscriptions?.enabled && pricingConfig.subscriptions?.plans?.length > 0;
  const hasOneTime = pricingConfig.one_time?.enabled && pricingConfig.one_time?.items?.length > 0;
  const hasAddOns = pricingConfig.add_ons?.enabled && pricingConfig.add_ons?.items?.length > 0;

  const subscriptionPlans = pricingConfig.subscriptions?.plans || [];
  const oneTimeItems = pricingConfig.one_time?.items || [];
  const addOnItems = pricingConfig.add_ons?.items || [];

  // Default to subscription if available, otherwise one-time
  useEffect(() => {
    if (hasSubscription) {
      setSelectedType('subscription');
      if (subscriptionPlans.length > 0) {
        setSelectedPlan(subscriptionPlans[0]);
      }
    } else if (hasOneTime) {
      setSelectedType('one_time');
      if (oneTimeItems.length > 0) {
        setSelectedOneTime(oneTimeItems[0]);
      }
    }
  }, [hasSubscription, hasOneTime]);

  const toggleAddOn = (addon) => {
    setSelectedAddOns(prev =>
      prev.find(a => a.id === addon.id)
        ? prev.filter(a => a.id !== addon.id)
        : [...prev, addon]
    );
  };

  const handleConfirm = () => {
    const selection = {
      type: selectedType,
      plan: selectedType === 'subscription' ? selectedPlan : null,
      billing_cycle: selectedCycle,
      oneTimeItem: selectedType === 'one_time' ? selectedOneTime : null,
      addOns: selectedAddOns
    };

    const lineItem = createLineItem(product, details, selection);
    onConfirm(lineItem);
  };

  // Calculate preview price
  let previewPrice = 0;
  if (selectedType === 'subscription' && selectedPlan) {
    previewPrice = selectedPlan.pricing?.[selectedCycle]?.amount || 0;
  } else if (selectedType === 'one_time' && selectedOneTime) {
    previewPrice = selectedOneTime.amount || 0;
  }

  // Add add-ons to preview
  const addOnsTotal = selectedAddOns.reduce((sum, addon) => {
    const price = addon.pricing_type === 'subscription'
      ? (addon.pricing?.monthly?.amount || 0)
      : (addon.pricing?.one_time?.amount || 0);
    return sum + price;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Product Info Header */}
      <div className={`flex items-center gap-3 p-4 rounded-lg ${ft('bg-slate-100 border border-slate-200', 'bg-zinc-900/50 border border-white/5')}`}>
        <div className="w-12 h-12 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
          <Zap className="w-6 h-6 text-cyan-400" />
        </div>
        <div className="flex-1">
          <h3 className={`font-medium ${ft('text-slate-900', 'text-white')}`}>{product.name}</h3>
          {product.short_description && (
            <p className={`text-sm ${ft('text-slate-400', 'text-zinc-500')}`}>{product.short_description}</p>
          )}
        </div>
      </div>

      {/* Pricing Type Tabs */}
      {(hasSubscription || hasOneTime) && (
        <Tabs value={selectedType} onValueChange={setSelectedType}>
          <TabsList className={ft('bg-slate-100 border border-slate-200', 'bg-zinc-900/50 border border-white/5')}>
            {hasSubscription && (
              <TabsTrigger value="subscription" className="data-[state=active]:bg-cyan-500/20">
                <RefreshCw className="w-4 h-4 mr-2" />
                Subscription
              </TabsTrigger>
            )}
            {hasOneTime && (
              <TabsTrigger value="one_time" className="data-[state=active]:bg-blue-500/20">
                <Zap className="w-4 h-4 mr-2" />
                One-time
              </TabsTrigger>
            )}
          </TabsList>

          {/* Subscription Plans */}
          {hasSubscription && (
            <TabsContent value="subscription" className="space-y-4 mt-4">
              {/* Plan Selection */}
              <div>
                <label className={`text-sm ${ft('text-slate-500', 'text-zinc-400')} mb-2 block`}>Select Plan</label>
                <div className="space-y-2">
                  {subscriptionPlans.map(plan => (
                    <div
                      key={plan.id}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-all",
                        selectedPlan?.id === plan.id
                          ? "bg-cyan-500/10 border-cyan-500/30"
                          : ft("bg-slate-100 border-slate-200 hover:border-slate-300", "bg-zinc-900/50 border-white/10 hover:border-white/20")
                      )}
                      onClick={() => setSelectedPlan(plan)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {selectedPlan?.id === plan.id && (
                            <Check className="w-4 h-4 text-cyan-400" />
                          )}
                          <span className={`font-medium ${ft('text-slate-900', 'text-white')}`}>{plan.name}</span>
                          {plan.is_popular && (
                            <Badge className="bg-cyan-500/20 text-cyan-400 text-xs">
                              <Star className="w-3 h-3 mr-1" /> Popular
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <span className={`text-lg font-semibold ${ft('text-slate-900', 'text-white')}`}>
                            {formatPrice(plan.pricing?.[selectedCycle]?.amount || 0, currency)}
                          </span>
                          <span className={`text-sm ${ft('text-slate-400', 'text-zinc-500')}`}>/{selectedCycle === 'yearly' ? 'year' : 'mo'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Billing Cycle */}
              <div>
                <label className={`text-sm ${ft('text-slate-500', 'text-zinc-400')} mb-2 block`}>Billing Cycle</label>
                <Select value={selectedCycle} onValueChange={setSelectedCycle}>
                  <SelectTrigger className={ft('bg-slate-100 border-slate-200', 'bg-zinc-900/50 border-white/10')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          )}

          {/* One-time Items */}
          {hasOneTime && (
            <TabsContent value="one_time" className="space-y-4 mt-4">
              <div>
                <label className={`text-sm ${ft('text-slate-500', 'text-zinc-400')} mb-2 block`}>Select Service</label>
                <div className="space-y-2">
                  {oneTimeItems.map(item => (
                    <div
                      key={item.id}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-all",
                        selectedOneTime?.id === item.id
                          ? "bg-blue-500/10 border-blue-500/30"
                          : ft("bg-slate-100 border-slate-200 hover:border-slate-300", "bg-zinc-900/50 border-white/10 hover:border-white/20")
                      )}
                      onClick={() => setSelectedOneTime(item)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {selectedOneTime?.id === item.id && (
                            <Check className="w-4 h-4 text-blue-400" />
                          )}
                          <span className={`font-medium ${ft('text-slate-900', 'text-white')}`}>{item.name}</span>
                        </div>
                        <span className={`text-lg font-semibold ${ft('text-slate-900', 'text-white')}`}>
                          {formatPrice(item.amount, currency)}
                        </span>
                      </div>
                      {item.description && (
                        <p className={`text-sm ${ft('text-slate-400', 'text-zinc-500')} mt-1`}>{item.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      )}

      {/* Add-ons */}
      {hasAddOns && (
        <div>
          <label className={`text-sm ${ft('text-slate-500', 'text-zinc-400')} mb-2 block flex items-center gap-2`}>
            <Gift className="w-4 h-4" />
            Optional Add-ons
          </label>
          <div className="space-y-2">
            {addOnItems.map(addon => {
              const isSelected = selectedAddOns.find(a => a.id === addon.id);
              const price = addon.pricing_type === 'subscription'
                ? (addon.pricing?.monthly?.amount || 0)
                : (addon.pricing?.one_time?.amount || 0);

              return (
                <div
                  key={addon.id}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all",
                    isSelected
                      ? "bg-purple-500/10 border-purple-500/30"
                      : ft("bg-slate-100 border-slate-200 hover:border-slate-300", "bg-zinc-900/50 border-white/10 hover:border-white/20")
                  )}
                  onClick={() => toggleAddOn(addon)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-5 h-5 rounded border flex items-center justify-center",
                        isSelected
                          ? "bg-purple-500 border-purple-500"
                          : ft("border-slate-300", "border-white/20")
                      )}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`font-medium ${ft('text-slate-900', 'text-white')}`}>{addon.name}</span>
                      {addon.pricing_type === 'subscription' && (
                        <Badge variant="outline" className="text-xs text-purple-400 border-purple-500/30">
                          <RefreshCw className="w-3 h-3 mr-1" /> Recurring
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`font-semibold ${ft('text-slate-900', 'text-white')}`}>
                        +{formatPrice(price, currency)}
                      </span>
                      {addon.pricing_type === 'subscription' && (
                        <span className={`text-xs ${ft('text-slate-400', 'text-zinc-500')}`}>/mo</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Price Summary */}
      <div className="p-4 rounded-lg bg-gradient-to-r from-cyan-500/10 to-cyan-600/5 border border-cyan-500/20">
        <div className="flex items-center justify-between">
          <span className={ft('text-slate-500', 'text-zinc-400')}>Line Item Total</span>
          <div className="text-right">
            <span className="text-2xl font-bold text-cyan-400">
              {formatPrice(previewPrice + addOnsTotal, currency)}
            </span>
            {selectedType === 'subscription' && (
              <span className={`text-sm ${ft('text-slate-400', 'text-zinc-500')} ml-1`}>
                /{selectedCycle === 'yearly' ? 'year' : 'mo'}
              </span>
            )}
          </div>
        </div>
        {addOnsTotal > 0 && (
          <p className={`text-xs ${ft('text-slate-400', 'text-zinc-500')} mt-1`}>
            Includes {selectedAddOns.length} add-on{selectedAddOns.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          onClick={handleConfirm}
          className="flex-1 bg-cyan-500 hover:bg-cyan-600"
          disabled={
            (selectedType === 'subscription' && !selectedPlan) ||
            (selectedType === 'one_time' && !selectedOneTime)
          }
        >
          <Plus className="w-4 h-4 mr-2" />
          Add to Invoice
        </Button>
        <Button variant="ghost" onClick={onCancel} className={ft('text-slate-500', 'text-zinc-400')}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function ServicePricingSelector({ product, details, currency, onConfirm, onCancel, ft }) {
  const pricingConfig = details?.pricing_config || {};
  const pricingModel = details?.pricing_model || 'project';

  const [selectedModel, setSelectedModel] = useState(pricingModel);
  const [hours, setHours] = useState(1);
  const [selectedProjectItems, setSelectedProjectItems] = useState([]);
  const [selectedMilestones, setSelectedMilestones] = useState([]);

  // Determine which pricing models are available
  const availableModels = [];
  if (pricingModel === 'hybrid') {
    if (pricingConfig.hourly?.enabled) availableModels.push('hourly');
    if (pricingConfig.retainer?.enabled) availableModels.push('retainer');
    if (pricingConfig.project?.enabled) availableModels.push('project');
    if (pricingConfig.milestones?.enabled) availableModels.push('milestone');
    if (pricingConfig.success_fee?.enabled) availableModels.push('success_fee');
  } else {
    availableModels.push(pricingModel);
  }

  useEffect(() => {
    if (availableModels.length > 0 && !availableModels.includes(selectedModel)) {
      setSelectedModel(availableModels[0]);
    }
  }, []);

  // Toggle project item selection
  const toggleProjectItem = (item) => {
    setSelectedProjectItems(prev =>
      prev.find(i => i.id === item.id)
        ? prev.filter(i => i.id !== item.id)
        : [...prev, item]
    );
  };

  // Toggle milestone selection
  const toggleMilestone = (item) => {
    setSelectedMilestones(prev =>
      prev.find(i => i.id === item.id)
        ? prev.filter(i => i.id !== item.id)
        : [...prev, item]
    );
  };

  // Calculate preview price based on selected model
  let previewPrice = 0;
  let previewLabel = '';

  switch (selectedModel) {
    case 'hourly':
      previewPrice = (pricingConfig.hourly?.rate || 0) * hours;
      previewLabel = `${hours} hr${hours !== 1 ? 's' : ''} x ${formatPrice(pricingConfig.hourly?.rate || 0, currency)}/hr`;
      break;
    case 'retainer':
      previewPrice = pricingConfig.retainer?.monthly_fee || 0;
      previewLabel = 'per month';
      break;
    case 'project':
      if (selectedProjectItems.length > 0) {
        previewPrice = selectedProjectItems.reduce((sum, item) => sum + (item.price || 0), 0);
        previewLabel = `${selectedProjectItems.length} deliverable${selectedProjectItems.length !== 1 ? 's' : ''}`;
      } else {
        previewPrice = (pricingConfig.project?.items || []).reduce((sum, item) => sum + (item.price || 0), 0);
        previewLabel = 'full project';
      }
      break;
    case 'milestone':
      if (selectedMilestones.length > 0) {
        previewPrice = selectedMilestones.reduce((sum, item) => sum + (item.amount || 0), 0);
        previewLabel = `${selectedMilestones.length} milestone${selectedMilestones.length !== 1 ? 's' : ''}`;
      } else {
        previewPrice = (pricingConfig.milestones?.items || []).reduce((sum, item) => sum + (item.amount || 0), 0);
        previewLabel = 'all milestones';
      }
      break;
    case 'success_fee':
      previewPrice = pricingConfig.success_fee?.base_fee || 0;
      previewLabel = pricingConfig.success_fee?.success_percentage
        ? `+ ${pricingConfig.success_fee.success_percentage}% success fee`
        : 'base fee';
      break;
  }

  const handleConfirm = () => {
    let servicePricing = { pricing_model: selectedModel };

    switch (selectedModel) {
      case 'hourly':
        servicePricing.unit_price = pricingConfig.hourly?.rate || 0;
        servicePricing.quantity = hours;
        servicePricing.description = `${product.name} - ${hours} hours @ ${formatPrice(pricingConfig.hourly?.rate || 0, currency)}/hr`;
        break;
      case 'retainer':
        servicePricing.unit_price = pricingConfig.retainer?.monthly_fee || 0;
        servicePricing.quantity = 1;
        servicePricing.is_subscription = true;
        servicePricing.billing_cycle = 'monthly';
        servicePricing.description = `${product.name} - Monthly Retainer`;
        break;
      case 'project':
        if (selectedProjectItems.length > 0) {
          servicePricing.unit_price = selectedProjectItems.reduce((sum, item) => sum + (item.price || 0), 0);
          servicePricing.description = `${product.name} - ${selectedProjectItems.map(i => i.name).join(', ')}`;
        } else {
          servicePricing.unit_price = (pricingConfig.project?.items || []).reduce((sum, item) => sum + (item.price || 0), 0);
          servicePricing.description = `${product.name} - Full Project`;
        }
        servicePricing.quantity = 1;
        break;
      case 'milestone':
        if (selectedMilestones.length > 0) {
          servicePricing.unit_price = selectedMilestones.reduce((sum, item) => sum + (item.amount || 0), 0);
          servicePricing.description = `${product.name} - ${selectedMilestones.map(i => i.name).join(', ')}`;
        } else {
          servicePricing.unit_price = (pricingConfig.milestones?.items || []).reduce((sum, item) => sum + (item.amount || 0), 0);
          servicePricing.description = `${product.name} - All Milestones`;
        }
        servicePricing.quantity = 1;
        break;
      case 'success_fee':
        servicePricing.unit_price = pricingConfig.success_fee?.base_fee || 0;
        servicePricing.quantity = 1;
        servicePricing.description = `${product.name} - Success Fee (${pricingConfig.success_fee?.success_percentage || 0}%)`;
        break;
    }

    const lineItem = createLineItem(product, details, { servicePricing });
    onConfirm(lineItem);
  };

  const modelIcons = {
    hourly: <Clock className="w-4 h-4" />,
    retainer: <RefreshCw className="w-4 h-4" />,
    project: <Briefcase className="w-4 h-4" />,
    milestone: <Flag className="w-4 h-4" />,
    success_fee: <Trophy className="w-4 h-4" />,
  };

  return (
    <div className="space-y-6">
      {/* Product Info Header */}
      <div className={`flex items-center gap-3 p-4 rounded-lg ${ft('bg-slate-100 border border-slate-200', 'bg-zinc-900/50 border border-white/5')}`}>
        <div className="w-12 h-12 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
          <Briefcase className="w-6 h-6 text-blue-400" />
        </div>
        <div className="flex-1">
          <h3 className={`font-medium ${ft('text-slate-900', 'text-white')}`}>{product.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            {details.service_type && (
              <Badge variant="outline" className="text-xs bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
                {details.service_type.charAt(0).toUpperCase() + details.service_type.slice(1)}
              </Badge>
            )}
            {details.pricing_model && (
              <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30">
                {SERVICE_PRICING_LABELS[details.pricing_model] || details.pricing_model}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Pricing Model Selector (for hybrid / multiple models) */}
      {availableModels.length > 1 && (
        <div>
          <label className={`text-sm ${ft('text-slate-500', 'text-zinc-400')} mb-2 block`}>Pricing Model</label>
          <Tabs value={selectedModel} onValueChange={setSelectedModel}>
            <TabsList className={ft('bg-slate-100 border border-slate-200', 'bg-zinc-900/50 border border-white/5')}>
              {availableModels.map(model => (
                <TabsTrigger key={model} value={model} className="text-xs data-[state=active]:bg-blue-500/20">
                  {modelIcons[model]}
                  <span className="ml-1.5">{SERVICE_PRICING_LABELS[model] || model}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Hourly Config */}
      {selectedModel === 'hourly' && pricingConfig.hourly && (
        <div className="space-y-3">
          <div className={`p-3 rounded-lg ${ft('bg-slate-100 border border-slate-200', 'bg-zinc-900/50 border border-white/5')}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm ${ft('text-slate-500', 'text-zinc-400')}`}>Rate</span>
              <span className={`font-semibold ${ft('text-slate-900', 'text-white')}`}>
                {formatPrice(pricingConfig.hourly.rate, currency)}/hr
              </span>
            </div>
            {pricingConfig.hourly.min_hours > 0 && (
              <p className={`text-xs ${ft('text-slate-400', 'text-zinc-500')}`}>
                Minimum: {pricingConfig.hourly.min_hours} hours
              </p>
            )}
          </div>
          <div>
            <label className={`text-sm ${ft('text-slate-500', 'text-zinc-400')} mb-2 block`}>Hours</label>
            <Input
              type="number"
              min={pricingConfig.hourly.min_hours || 1}
              value={hours}
              onChange={(e) => setHours(Math.max(1, parseInt(e.target.value) || 1))}
              className={ft('bg-slate-100 border-slate-200', 'bg-zinc-800 border-white/10')}
            />
          </div>
        </div>
      )}

      {/* Retainer Config */}
      {selectedModel === 'retainer' && pricingConfig.retainer && (
        <div className={`p-3 rounded-lg ${ft('bg-slate-100 border border-slate-200', 'bg-zinc-900/50 border border-white/5')}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm ${ft('text-slate-500', 'text-zinc-400')}`}>Monthly Fee</span>
            <span className={`font-semibold ${ft('text-slate-900', 'text-white')}`}>
              {formatPrice(pricingConfig.retainer.monthly_fee, currency)}/mo
            </span>
          </div>
          {pricingConfig.retainer.included_hours > 0 && (
            <p className={`text-xs ${ft('text-slate-400', 'text-zinc-500')}`}>
              Includes {pricingConfig.retainer.included_hours} hours
            </p>
          )}
          {pricingConfig.retainer.overage_rate > 0 && (
            <p className={`text-xs ${ft('text-slate-400', 'text-zinc-500')}`}>
              Overage: {formatPrice(pricingConfig.retainer.overage_rate, currency)}/hr
            </p>
          )}
        </div>
      )}

      {/* Project Items */}
      {selectedModel === 'project' && pricingConfig.project?.items?.length > 0 && (
        <div>
          <label className={`text-sm ${ft('text-slate-500', 'text-zinc-400')} mb-2 block`}>Select Deliverables</label>
          <div className="space-y-2">
            {pricingConfig.project.items.map(item => {
              const isItemSelected = selectedProjectItems.find(i => i.id === item.id);
              return (
                <div
                  key={item.id}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all",
                    isItemSelected
                      ? "bg-blue-500/10 border-blue-500/30"
                      : ft("bg-slate-100 border-slate-200 hover:border-slate-300", "bg-zinc-900/50 border-white/10 hover:border-white/20")
                  )}
                  onClick={() => toggleProjectItem(item)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-5 h-5 rounded border flex items-center justify-center",
                        isItemSelected
                          ? "bg-blue-500 border-blue-500"
                          : ft("border-slate-300", "border-white/20")
                      )}>
                        {isItemSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`font-medium ${ft('text-slate-900', 'text-white')}`}>{item.name}</span>
                    </div>
                    <span className={`font-semibold ${ft('text-slate-900', 'text-white')}`}>
                      {formatPrice(item.price, currency)}
                    </span>
                  </div>
                  {item.description && (
                    <p className={`text-sm ${ft('text-slate-400', 'text-zinc-500')} mt-1 ml-7`}>{item.description}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Milestone Items */}
      {selectedModel === 'milestone' && pricingConfig.milestones?.items?.length > 0 && (
        <div>
          <label className={`text-sm ${ft('text-slate-500', 'text-zinc-400')} mb-2 block`}>Select Milestones to Invoice</label>
          <div className="space-y-2">
            {pricingConfig.milestones.items.map(item => {
              const isItemSelected = selectedMilestones.find(i => i.id === item.id);
              return (
                <div
                  key={item.id}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all",
                    isItemSelected
                      ? "bg-blue-500/10 border-blue-500/30"
                      : ft("bg-slate-100 border-slate-200 hover:border-slate-300", "bg-zinc-900/50 border-white/10 hover:border-white/20")
                  )}
                  onClick={() => toggleMilestone(item)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-5 h-5 rounded border flex items-center justify-center",
                        isItemSelected
                          ? "bg-blue-500 border-blue-500"
                          : ft("border-slate-300", "border-white/20")
                      )}>
                        {isItemSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`font-medium ${ft('text-slate-900', 'text-white')}`}>{item.name}</span>
                    </div>
                    <span className={`font-semibold ${ft('text-slate-900', 'text-white')}`}>
                      {formatPrice(item.amount, currency)}
                    </span>
                  </div>
                  {item.description && (
                    <p className={`text-sm ${ft('text-slate-400', 'text-zinc-500')} mt-1 ml-7`}>{item.description}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Success Fee */}
      {selectedModel === 'success_fee' && pricingConfig.success_fee && (
        <div className={`p-3 rounded-lg ${ft('bg-slate-100 border border-slate-200', 'bg-zinc-900/50 border border-white/5')}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm ${ft('text-slate-500', 'text-zinc-400')}`}>Base Fee</span>
            <span className={`font-semibold ${ft('text-slate-900', 'text-white')}`}>
              {formatPrice(pricingConfig.success_fee.base_fee, currency)}
            </span>
          </div>
          {pricingConfig.success_fee.success_percentage > 0 && (
            <div className="flex items-center justify-between">
              <span className={`text-sm ${ft('text-slate-500', 'text-zinc-400')}`}>Success Fee</span>
              <span className={`font-semibold ${ft('text-slate-900', 'text-white')}`}>
                {pricingConfig.success_fee.success_percentage}%
              </span>
            </div>
          )}
          {pricingConfig.success_fee.metric && (
            <p className={`text-xs ${ft('text-slate-400', 'text-zinc-500')} mt-2`}>
              Metric: {pricingConfig.success_fee.metric}
            </p>
          )}
        </div>
      )}

      {/* Price Summary */}
      <div className="p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-cyan-600/5 border border-blue-500/20">
        <div className="flex items-center justify-between">
          <span className={ft('text-slate-500', 'text-zinc-400')}>Line Item Total</span>
          <div className="text-right">
            <span className="text-2xl font-bold text-blue-400">
              {formatPrice(previewPrice, currency)}
            </span>
            {previewLabel && (
              <span className={`text-sm ${ft('text-slate-400', 'text-zinc-500')} ml-1`}>
                {previewLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          onClick={handleConfirm}
          className="flex-1 bg-blue-500 hover:bg-blue-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add to Invoice
        </Button>
        <Button variant="ghost" onClick={onCancel} className={ft('text-slate-500', 'text-zinc-400')}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default function ProductSelector({
  open,
  onClose,
  onSelect,
  currency = 'EUR',
  excludeIds = []
}) {
  const { ft } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [productDetails, setProductDetails] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const { user } = useUser();

  const loadProducts = async () => {
    if (!user?.company_id) return;

    setLoading(true);
    try {
      // Load all products (draft, published, or active - all usable in proposals)
      const allProducts = await Product.filter({
        company_id: user.company_id
      });

      // Filter out excluded products and archived ones
      const filtered = allProducts.filter(p =>
        !excludeIds.includes(p.id) && p.status !== 'archived'
      );
      setProducts(filtered);

      // Load details for digital products
      const digitalProducts = filtered.filter(p => p.type === 'digital');
      const detailsMap = {};

      for (const product of digitalProducts) {
        try {
          const details = await DigitalProduct.filter({ product_id: product.id }, { limit: 1 });
          if (details && details[0]) {
            detailsMap[product.id] = details[0];
          }
        } catch (err) {
          console.warn(`Could not load details for product ${product.id}:`, err);
        }
      }

      // Load details for physical products
      const physicalProducts = filtered.filter(p => p.type === 'physical');
      for (const product of physicalProducts) {
        try {
          const details = await PhysicalProduct.filter({ product_id: product.id }, { limit: 1 });
          if (details && details[0]) {
            detailsMap[product.id] = details[0];
          }
        } catch (err) {
          console.warn(`Could not load details for product ${product.id}:`, err);
        }
      }

      // Load details for service products
      const serviceProducts = filtered.filter(p => p.type === 'service');
      for (const product of serviceProducts) {
        try {
          const details = await ServiceProduct.filter({ product_id: product.id }, { limit: 1 });
          if (details && details[0]) {
            detailsMap[product.id] = details[0];
          }
        } catch (err) {
          console.warn(`Could not load details for product ${product.id}:`, err);
        }
      }

      setProductDetails(detailsMap);
    } catch (err) {
      console.error('Failed to load products:', err);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadProducts();
      setSelectedProduct(null);
      setSelectedDetails(null);
      setSearchQuery('');
    }
  }, [open, user?.company_id]);

  // Filter products based on search and tab
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // Search filter
      const matchesSearch = !searchQuery ||
        product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchQuery.toLowerCase());

      // Tab filter
      const matchesTab = activeTab === 'all' ||
        (activeTab === 'digital' && product.type === 'digital') ||
        (activeTab === 'physical' && product.type === 'physical') ||
        (activeTab === 'service' && product.type === 'service');

      return matchesSearch && matchesTab;
    });
  }, [products, searchQuery, activeTab]);

  const handleProductSelect = (product, details) => {
    // If digital product with pricing options, show selector
    if (product.type === 'digital' && details?.pricing_config) {
      const config = details.pricing_config;
      const hasOptions = config.subscriptions?.enabled || config.one_time?.enabled;
      if (hasOptions) {
        setSelectedProduct(product);
        setSelectedDetails(details);
        return;
      }
    }

    // If service product with pricing config, show service selector
    if (product.type === 'service' && details?.pricing_config) {
      setSelectedProduct(product);
      setSelectedDetails(details);
      return;
    }

    // Otherwise, add as simple line item
    const lineItem = createLineItem(product, details, {});
    onSelect(lineItem);
    onClose();
  };

  const handlePricingConfirm = (lineItem) => {
    onSelect(lineItem);
    onClose();
  };

  // If a product is selected for pricing options (digital or service)
  if (selectedProduct) {
    const isServiceSelected = selectedProduct.type === 'service';
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className={`max-w-lg ${ft('bg-white border-slate-200', 'bg-zinc-900 border-white/10')} max-h-[80vh] overflow-y-auto`}>
          <DialogHeader>
            <DialogTitle className={`${ft('text-slate-900', 'text-white')} flex items-center gap-2`}>
              {isServiceSelected ? (
                <Briefcase className="w-5 h-5 text-blue-400" />
              ) : (
                <CreditCard className="w-5 h-5 text-cyan-400" />
              )}
              Select Pricing Options
            </DialogTitle>
          </DialogHeader>
          {isServiceSelected ? (
            <ServicePricingSelector
              product={selectedProduct}
              details={selectedDetails}
              currency={currency}
              ft={ft}
              onConfirm={handlePricingConfirm}
              onCancel={() => {
                setSelectedProduct(null);
                setSelectedDetails(null);
              }}
            />
          ) : (
            <DigitalPricingSelector
              product={selectedProduct}
              details={selectedDetails}
              currency={currency}
              ft={ft}
              onConfirm={handlePricingConfirm}
              onCancel={() => {
                setSelectedProduct(null);
                setSelectedDetails(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={`max-w-2xl ${ft('bg-white border-slate-200', 'bg-zinc-900 border-white/10')} max-h-[80vh] overflow-hidden flex flex-col`}>
        <DialogHeader>
          <DialogTitle className={`${ft('text-slate-900', 'text-white')} flex items-center gap-2`}>
            <Package className="w-5 h-5 text-cyan-400" />
            Add Product to Invoice
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Search & Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${ft('text-slate-400', 'text-zinc-500')}`} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products by name or SKU..."
                className={`pl-9 ${ft('bg-slate-100 border-slate-200', 'bg-zinc-800 border-white/10')}`}
              />
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className={ft('bg-slate-100 border border-slate-200', 'bg-zinc-800 border border-white/5')}>
                <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                <TabsTrigger value="digital" className="text-xs">Digital</TabsTrigger>
                <TabsTrigger value="physical" className="text-xs">Physical</TabsTrigger>
                <TabsTrigger value="service" className="text-xs">Services</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Product List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className={`h-20 rounded-xl ${ft('bg-slate-200', 'bg-zinc-800/50')} animate-pulse`} />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className={`w-12 h-12 ${ft('text-slate-300', 'text-zinc-600')} mx-auto mb-3`} />
                <p className={ft('text-slate-500', 'text-zinc-400')}>
                  {products.length === 0 ? 'No published products' : 'No products match your search'}
                </p>
              </div>
            ) : (
              filteredProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  details={productDetails[product.id]}
                  currency={currency}
                  onSelect={handleProductSelect}
                  isSelected={false}
                  ft={ft}
                />
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Export helper for creating line items programmatically
export { createLineItem };
