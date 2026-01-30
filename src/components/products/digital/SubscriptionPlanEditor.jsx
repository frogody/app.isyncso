import React, { useState } from 'react';
import {
  Plus, Trash2, Edit2, Check, X, ChevronDown, ChevronUp,
  GripVertical, CreditCard, Star, Users, HardDrive, Percent
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function formatPrice(amount, currency = 'EUR') {
  if (!amount && amount !== 0) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

function generatePlanId() {
  return `plan_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;
}

const DEFAULT_PLAN = {
  id: '',
  name: '',
  description: '',
  pricing: {
    monthly: { amount: 0, currency: 'EUR' },
    yearly: { amount: 0, currency: 'EUR', discount_percent: 0 }
  },
  features: [],
  limits: {},
  is_popular: false,
  trial_days: 0,
  sort_order: 0
};

function PlanCard({ plan, currency, onUpdate, onDelete, isEditing, setEditingId }) {
  const [localPlan, setLocalPlan] = useState(plan);
  const [isExpanded, setIsExpanded] = useState(false);
  const [newFeature, setNewFeature] = useState('');

  const monthlyPrice = plan.pricing?.monthly?.amount || 0;
  const yearlyPrice = plan.pricing?.yearly?.amount || 0;
  const yearlyDiscount = plan.pricing?.yearly?.discount_percent || 0;
  const effectiveYearly = yearlyPrice || (monthlyPrice * 12 * (1 - yearlyDiscount / 100));

  const handleSave = () => {
    if (!localPlan.name?.trim()) {
      toast.error('Plan name is required');
      return;
    }
    onUpdate(localPlan);
    setEditingId(null);
    toast.success('Plan updated');
  };

  const handleCancel = () => {
    setLocalPlan(plan);
    setEditingId(null);
  };

  const addFeature = () => {
    if (!newFeature.trim()) return;
    setLocalPlan(prev => ({
      ...prev,
      features: [...(prev.features || []), newFeature.trim()]
    }));
    setNewFeature('');
  };

  const removeFeature = (index) => {
    setLocalPlan(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const updatePricing = (cycle, field, value) => {
    setLocalPlan(prev => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        [cycle]: {
          ...prev.pricing?.[cycle],
          [field]: value,
          currency
        }
      }
    }));
  };

  if (isEditing) {
    return (
      <div className="p-5 rounded-xl bg-zinc-800/50 border border-cyan-500/30 space-y-4">
        {/* Header */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Plan Name *</label>
            <Input
              value={localPlan.name}
              onChange={(e) => setLocalPlan({ ...localPlan, name: e.target.value })}
              placeholder="e.g., Pro, Business, Enterprise"
              className="bg-zinc-900 border-zinc-700"
            />
          </div>
          <div className="flex items-end gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch
                checked={localPlan.is_popular}
                onCheckedChange={(checked) => setLocalPlan({ ...localPlan, is_popular: checked })}
              />
              <span className="text-sm text-zinc-400">Popular</span>
            </label>
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Description</label>
          <Textarea
            value={localPlan.description || ''}
            onChange={(e) => setLocalPlan({ ...localPlan, description: e.target.value })}
            placeholder="Brief description of this plan"
            className="bg-zinc-900 border-zinc-700 resize-none"
            rows={2}
          />
        </div>

        {/* Pricing */}
        <div className="p-4 rounded-lg bg-zinc-900/50 border border-white/5">
          <h4 className="text-sm font-medium text-white mb-3">Pricing</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Monthly Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                  {'€'}
                </span>
                <Input
                  type="number"
                  step="0.01"
                  value={localPlan.pricing?.monthly?.amount || ''}
                  onChange={(e) => updatePricing('monthly', 'amount', parseFloat(e.target.value) || 0)}
                  className="pl-7 bg-zinc-900 border-zinc-700"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Yearly Price (or discount %)</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    {'€'}
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    value={localPlan.pricing?.yearly?.amount || ''}
                    onChange={(e) => updatePricing('yearly', 'amount', parseFloat(e.target.value) || 0)}
                    className="pl-7 bg-zinc-900 border-zinc-700"
                    placeholder="0.00"
                  />
                </div>
                <div className="relative w-20">
                  <Input
                    type="number"
                    value={localPlan.pricing?.yearly?.discount_percent || ''}
                    onChange={(e) => updatePricing('yearly', 'discount_percent', parseFloat(e.target.value) || 0)}
                    className="pr-6 bg-zinc-900 border-zinc-700"
                    placeholder="0"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="p-4 rounded-lg bg-zinc-900/50 border border-white/5">
          <h4 className="text-sm font-medium text-white mb-3">Features</h4>
          <div className="space-y-2">
            {(localPlan.features || []).map((feature, index) => (
              <div key={index} className="flex items-center gap-2">
                <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <span className="text-sm text-zinc-300 flex-1">{feature}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-zinc-500 hover:text-red-400"
                  onClick={() => removeFeature(index)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <Input
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                placeholder="Add a feature..."
                className="bg-zinc-900 border-zinc-700 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && addFeature()}
              />
              <Button size="sm" variant="outline" onClick={addFeature} className="border-white/10">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Limits */}
        <div className="p-4 rounded-lg bg-zinc-900/50 border border-white/5">
          <h4 className="text-sm font-medium text-white mb-3">Limits (Optional)</h4>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-zinc-500 mb-1 block flex items-center gap-1">
                <Users className="w-3 h-3" /> Users
              </label>
              <Input
                type="number"
                value={localPlan.limits?.users || ''}
                onChange={(e) => setLocalPlan({
                  ...localPlan,
                  limits: { ...localPlan.limits, users: parseInt(e.target.value) || null }
                })}
                placeholder="Unlimited"
                className="bg-zinc-900 border-zinc-700"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block flex items-center gap-1">
                <HardDrive className="w-3 h-3" /> Storage (GB)
              </label>
              <Input
                type="number"
                value={localPlan.limits?.storage_gb || ''}
                onChange={(e) => setLocalPlan({
                  ...localPlan,
                  limits: { ...localPlan.limits, storage_gb: parseInt(e.target.value) || null }
                })}
                placeholder="Unlimited"
                className="bg-zinc-900 border-zinc-700"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Trial Days</label>
              <Input
                type="number"
                value={localPlan.trial_days || ''}
                onChange={(e) => setLocalPlan({ ...localPlan, trial_days: parseInt(e.target.value) || 0 })}
                placeholder="0"
                className="bg-zinc-900 border-zinc-700"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Button size="sm" onClick={handleSave} className="bg-cyan-500 hover:bg-cyan-600">
            <Check className="w-4 h-4 mr-1" /> Save Plan
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCancel} className="text-zinc-400">
            <X className="w-4 h-4 mr-1" /> Cancel
          </Button>
        </div>
      </div>
    );
  }

  // View Mode
  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className={cn(
        "p-4 rounded-xl border transition-all group",
        plan.is_popular
          ? "bg-gradient-to-r from-cyan-500/5 to-cyan-500/10 border-cyan-500/30"
          : "bg-zinc-900/50 border-white/5 hover:border-white/10"
      )}>
        <div className="flex items-center gap-4">
          <GripVertical className="w-4 h-4 text-zinc-600 cursor-grab flex-shrink-0" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-white">{plan.name}</span>
              {plan.is_popular && (
                <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                  <Star className="w-3 h-3 mr-1" /> Popular
                </Badge>
              )}
              {plan.trial_days > 0 && (
                <Badge variant="outline" className="border-white/10 text-zinc-500 text-xs">
                  {plan.trial_days}d trial
                </Badge>
              )}
            </div>
            {plan.description && (
              <p className="text-sm text-zinc-500 mt-0.5 truncate">{plan.description}</p>
            )}
          </div>

          <div className="text-right flex-shrink-0">
            <div className="text-lg font-semibold text-white">
              {formatPrice(monthlyPrice, currency)}
              <span className="text-sm text-zinc-500 font-normal">/mo</span>
            </div>
            {yearlyDiscount > 0 && (
              <div className="text-xs text-cyan-400">
                Save {yearlyDiscount}% yearly
              </div>
            )}
          </div>

          <CollapsibleTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400">
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </CollapsibleTrigger>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-zinc-400 hover:text-white"
              onClick={() => setEditingId(plan.id)}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-zinc-400 hover:text-red-400"
              onClick={() => onDelete(plan.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <CollapsibleContent>
          <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-6">
            {/* Features */}
            {plan.features?.length > 0 && (
              <div>
                <h5 className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Features</h5>
                <ul className="space-y-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-zinc-300">
                      <Check className="w-3 h-3 text-cyan-400" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Limits */}
            {Object.keys(plan.limits || {}).length > 0 && (
              <div>
                <h5 className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Limits</h5>
                <div className="space-y-1">
                  {plan.limits?.users && (
                    <div className="flex items-center gap-2 text-sm text-zinc-300">
                      <Users className="w-3 h-3 text-zinc-500" />
                      {plan.limits.users} users
                    </div>
                  )}
                  {plan.limits?.storage_gb && (
                    <div className="flex items-center gap-2 text-sm text-zinc-300">
                      <HardDrive className="w-3 h-3 text-zinc-500" />
                      {plan.limits.storage_gb} GB storage
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export default function SubscriptionPlanEditor({
  plans = [],
  defaultCycle = 'monthly',
  currency = 'EUR',
  onPlansChange,
  onDefaultCycleChange
}) {
  const [editingId, setEditingId] = useState(null);

  const handleAddPlan = () => {
    const newPlan = {
      ...DEFAULT_PLAN,
      id: generatePlanId(),
      name: `Plan ${plans.length + 1}`,
      pricing: {
        monthly: { amount: 0, currency },
        yearly: { amount: 0, currency, discount_percent: 0 }
      },
      sort_order: plans.length
    };
    onPlansChange?.([...plans, newPlan]);
    setEditingId(newPlan.id);
  };

  const handleUpdatePlan = (updatedPlan) => {
    const newPlans = plans.map(p => p.id === updatedPlan.id ? updatedPlan : p);
    onPlansChange?.(newPlans);
  };

  const handleDeletePlan = (planId) => {
    const newPlans = plans.filter(p => p.id !== planId);
    onPlansChange?.(newPlans);
    toast.success('Plan deleted');
  };

  return (
    <div className="space-y-4">
      {/* Default Cycle Toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-white/5">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-zinc-500" />
          <span className="text-sm text-zinc-400">Default billing cycle:</span>
        </div>
        <Select value={defaultCycle} onValueChange={onDefaultCycleChange}>
          <SelectTrigger className="w-32 bg-zinc-900 border-zinc-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Plans List */}
      {plans.length === 0 ? (
        <div className="text-center py-8 rounded-lg border border-dashed border-white/10">
          <CreditCard className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-sm text-zinc-500 mb-3">No subscription plans yet</p>
          <Button variant="outline" onClick={handleAddPlan} className="border-white/10">
            <Plus className="w-4 h-4 mr-2" /> Add First Plan
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              currency={currency}
              onUpdate={handleUpdatePlan}
              onDelete={handleDeletePlan}
              isEditing={editingId === plan.id}
              setEditingId={setEditingId}
            />
          ))}

          <Button
            variant="ghost"
            size="sm"
            className="w-full text-zinc-400 hover:text-white hover:bg-white/5 border border-dashed border-white/10"
            onClick={handleAddPlan}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Plan
          </Button>
        </div>
      )}
    </div>
  );
}
