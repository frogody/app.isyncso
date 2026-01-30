import React, { useState } from 'react';
import {
  Plus, Trash2, Edit2, Check, X, GripVertical, Gift,
  RefreshCw, Zap, Shield, Headphones, Cpu, Cloud, Star
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
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function formatPrice(amount, currency = 'EUR') {
  if (!amount && amount !== 0) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

function generateItemId() {
  return `addon_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;
}

const ADDON_TYPES = [
  { value: 'support', label: 'Priority Support', icon: Headphones },
  { value: 'storage', label: 'Extra Storage', icon: Cloud },
  { value: 'users', label: 'Additional Users', icon: Star },
  { value: 'security', label: 'Security', icon: Shield },
  { value: 'api', label: 'API Access', icon: Cpu },
  { value: 'feature', label: 'Feature Unlock', icon: Zap },
  { value: 'other', label: 'Other', icon: Gift },
];

const TYPE_COLORS = {
  support: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  storage: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
  users: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
  security: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
  api: 'bg-pink-500/10 border-pink-500/30 text-pink-400',
  feature: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  other: 'bg-zinc-500/10 border-zinc-500/30 text-zinc-400',
};

const DEFAULT_ADDON = {
  id: '',
  name: '',
  description: '',
  addon_type: 'other',
  pricing_type: 'one_time', // 'one_time' | 'subscription'
  pricing: {
    one_time: { amount: 0 },
    monthly: { amount: 0 },
    yearly: { amount: 0 }
  },
  is_popular: false,
  sort_order: 0
};

function AddOnRow({ item, currency, onUpdate, onDelete, isEditing, setEditingId }) {
  const [localItem, setLocalItem] = useState(item);

  const addonType = ADDON_TYPES.find(t => t.value === item.addon_type) || ADDON_TYPES[6];
  const TypeIcon = addonType.icon;
  const colorClass = TYPE_COLORS[item.addon_type] || TYPE_COLORS.other;

  const isSubscription = item.pricing_type === 'subscription';
  const price = isSubscription
    ? item.pricing?.monthly?.amount || 0
    : item.pricing?.one_time?.amount || 0;

  const handleSave = () => {
    if (!localItem.name?.trim()) {
      toast.error('Add-on name is required');
      return;
    }
    onUpdate(localItem);
    setEditingId(null);
    toast.success('Add-on updated');
  };

  const handleCancel = () => {
    setLocalItem(item);
    setEditingId(null);
  };

  const updatePricing = (type, amount) => {
    setLocalItem(prev => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        [type]: { amount, currency }
      }
    }));
  };

  if (isEditing) {
    return (
      <div className="p-4 rounded-xl bg-zinc-800/50 border border-blue-500/30 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Add-on Name *</label>
            <Input
              value={localItem.name}
              onChange={(e) => setLocalItem({ ...localItem, name: e.target.value })}
              placeholder="e.g., Priority Support"
              className="bg-zinc-900 border-zinc-700"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Type</label>
            <Select
              value={localItem.addon_type}
              onValueChange={(val) => setLocalItem({ ...localItem, addon_type: val })}
            >
              <SelectTrigger className="bg-zinc-900 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADDON_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="w-4 h-4" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Description</label>
          <Textarea
            value={localItem.description || ''}
            onChange={(e) => setLocalItem({ ...localItem, description: e.target.value })}
            placeholder="What does this add-on include?"
            className="bg-zinc-900 border-zinc-700 resize-none"
            rows={2}
          />
        </div>

        {/* Pricing Type */}
        <div className="p-4 rounded-lg bg-zinc-900/50 border border-white/5">
          <div className="flex items-center gap-4 mb-4">
            <label className="text-xs text-zinc-500">Pricing Type:</label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={localItem.pricing_type === 'one_time'}
                  onChange={() => setLocalItem({ ...localItem, pricing_type: 'one_time' })}
                  className="text-blue-500"
                />
                <span className="text-sm text-zinc-300">One-time</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={localItem.pricing_type === 'subscription'}
                  onChange={() => setLocalItem({ ...localItem, pricing_type: 'subscription' })}
                  className="text-blue-500"
                />
                <span className="text-sm text-zinc-300">Recurring</span>
              </label>
            </div>
          </div>

          {localItem.pricing_type === 'one_time' ? (
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">One-time Price</label>
              <div className="relative w-40">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                  {'€'}
                </span>
                <Input
                  type="number"
                  step="0.01"
                  value={localItem.pricing?.one_time?.amount || ''}
                  onChange={(e) => updatePricing('one_time', parseFloat(e.target.value) || 0)}
                  className="pl-7 bg-zinc-900 border-zinc-700"
                  placeholder="0.00"
                />
              </div>
            </div>
          ) : (
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
                    value={localItem.pricing?.monthly?.amount || ''}
                    onChange={(e) => updatePricing('monthly', parseFloat(e.target.value) || 0)}
                    className="pl-7 bg-zinc-900 border-zinc-700"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Yearly Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    {'€'}
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    value={localItem.pricing?.yearly?.amount || ''}
                    onChange={(e) => updatePricing('yearly', parseFloat(e.target.value) || 0)}
                    className="pl-7 bg-zinc-900 border-zinc-700"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Popular Toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <Switch
            checked={localItem.is_popular}
            onCheckedChange={(checked) => setLocalItem({ ...localItem, is_popular: checked })}
          />
          <span className="text-sm text-zinc-400">Mark as popular/recommended</span>
        </label>

        <div className="flex items-center gap-2 pt-2">
          <Button size="sm" onClick={handleSave} className="bg-blue-500 hover:bg-blue-600">
            <Check className="w-4 h-4 mr-1" /> Save
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCancel} className="text-zinc-400">
            <X className="w-4 h-4 mr-1" /> Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "p-3 rounded-xl border transition-all group",
      item.is_popular
        ? "bg-gradient-to-r from-blue-500/5 to-blue-500/10 border-blue-500/30"
        : "bg-zinc-900/50 border-white/5 hover:border-white/10"
    )}>
      <div className="flex items-center gap-3">
        <GripVertical className="w-4 h-4 text-zinc-600 cursor-grab flex-shrink-0" />

        <div className={cn("w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0", colorClass)}>
          <TypeIcon className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">{item.name}</span>
            {item.is_popular && (
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                <Star className="w-3 h-3 mr-1" /> Popular
              </Badge>
            )}
            <Badge variant="outline" className={cn("text-xs", colorClass)}>
              {addonType.label}
            </Badge>
          </div>
          {item.description && (
            <p className="text-sm text-zinc-500 mt-0.5 truncate">{item.description}</p>
          )}
        </div>

        <div className="text-right flex-shrink-0">
          <div className="text-lg font-semibold text-white">
            {formatPrice(price, currency)}
            {isSubscription && (
              <span className="text-sm text-zinc-500 font-normal">/mo</span>
            )}
          </div>
          <div className="text-xs text-zinc-500">
            {isSubscription ? (
              <span className="flex items-center gap-1 justify-end">
                <RefreshCw className="w-3 h-3" /> Recurring
              </span>
            ) : (
              'One-time'
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-zinc-400 hover:text-white"
            onClick={() => setEditingId(item.id)}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-zinc-400 hover:text-red-400"
            onClick={() => onDelete(item.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AddOnEditor({
  items = [],
  currency = 'EUR',
  onItemsChange
}) {
  const [editingId, setEditingId] = useState(null);

  const handleAddItem = () => {
    const newItem = {
      ...DEFAULT_ADDON,
      id: generateItemId(),
      name: '',
      sort_order: items.length
    };
    onItemsChange?.([...items, newItem]);
    setEditingId(newItem.id);
  };

  const handleUpdateItem = (updatedItem) => {
    const newItems = items.map(i => i.id === updatedItem.id ? updatedItem : i);
    onItemsChange?.(newItems);
  };

  const handleDeleteItem = (itemId) => {
    const newItems = items.filter(i => i.id !== itemId);
    onItemsChange?.(newItems);
    toast.success('Add-on deleted');
  };

  // Calculate stats
  const recurringCount = items.filter(i => i.pricing_type === 'subscription').length;
  const oneTimeCount = items.length - recurringCount;

  return (
    <div className="space-y-4">
      {/* Summary */}
      {items.length > 0 && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-white/5">
          <span className="text-sm text-zinc-400">
            {items.length} add-on{items.length !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <span>{recurringCount} recurring</span>
            <span>{oneTimeCount} one-time</span>
          </div>
        </div>
      )}

      {/* Items List */}
      {items.length === 0 ? (
        <div className="text-center py-8 rounded-lg border border-dashed border-white/10">
          <Gift className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-sm text-zinc-500 mb-3">No add-ons yet</p>
          <p className="text-xs text-zinc-600 mb-4">
            Create optional extras like priority support, additional storage, or feature unlocks
          </p>
          <Button variant="outline" onClick={handleAddItem} className="border-white/10">
            <Plus className="w-4 h-4 mr-2" /> Add Add-on
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <AddOnRow
              key={item.id}
              item={item}
              currency={currency}
              onUpdate={handleUpdateItem}
              onDelete={handleDeleteItem}
              isEditing={editingId === item.id}
              setEditingId={setEditingId}
            />
          ))}

          <Button
            variant="ghost"
            size="sm"
            className="w-full text-zinc-400 hover:text-white hover:bg-white/5 border border-dashed border-white/10"
            onClick={handleAddItem}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Add-on
          </Button>
        </div>
      )}
    </div>
  );
}
