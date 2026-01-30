import React, { useState } from 'react';
import {
  Plus, Trash2, Edit2, Check, X, GripVertical, Zap,
  Wrench, Code, Settings, BookOpen, Rocket, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  return `ot_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;
}

const CATEGORIES = [
  { value: 'setup', label: 'Setup & Configuration', icon: Settings },
  { value: 'migration', label: 'Migration', icon: Rocket },
  { value: 'consultancy', label: 'Consultancy', icon: BookOpen },
  { value: 'development', label: 'Custom Development', icon: Code },
  { value: 'training', label: 'Training', icon: BookOpen },
  { value: 'support', label: 'One-time Support', icon: Wrench },
  { value: 'other', label: 'Other', icon: Zap },
];

const CATEGORY_COLORS = {
  setup: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  migration: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
  consultancy: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  development: 'bg-pink-500/10 border-pink-500/30 text-pink-400',
  training: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
  support: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
  other: 'bg-zinc-500/10 border-zinc-500/30 text-zinc-400',
};

const DEFAULT_ITEM = {
  id: '',
  name: '',
  description: '',
  amount: 0,
  category: 'other',
  estimated_hours: null,
  sort_order: 0
};

function ItemRow({ item, currency, onUpdate, onDelete, isEditing, setEditingId }) {
  const [localItem, setLocalItem] = useState(item);

  const category = CATEGORIES.find(c => c.value === item.category) || CATEGORIES[6];
  const CategoryIcon = category.icon;
  const colorClass = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.other;

  const handleSave = () => {
    if (!localItem.name?.trim()) {
      toast.error('Item name is required');
      return;
    }
    onUpdate(localItem);
    setEditingId(null);
    toast.success('Item updated');
  };

  const handleCancel = () => {
    setLocalItem(item);
    setEditingId(null);
  };

  if (isEditing) {
    return (
      <div className="p-4 rounded-xl bg-zinc-800/50 border border-cyan-500/30 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Service Name *</label>
            <Input
              value={localItem.name}
              onChange={(e) => setLocalItem({ ...localItem, name: e.target.value })}
              placeholder="e.g., Initial Setup"
              className="bg-zinc-900 border-zinc-700"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Category</label>
            <Select
              value={localItem.category}
              onValueChange={(val) => setLocalItem({ ...localItem, category: val })}
            >
              <SelectTrigger className="bg-zinc-900 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    <div className="flex items-center gap-2">
                      <cat.icon className="w-4 h-4" />
                      {cat.label}
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
            placeholder="What's included in this service?"
            className="bg-zinc-900 border-zinc-700 resize-none"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Price</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                {currency === 'EUR' ? '€' : '$'}
              </span>
              <Input
                type="number"
                step="0.01"
                value={localItem.amount || ''}
                onChange={(e) => setLocalItem({ ...localItem, amount: parseFloat(e.target.value) || 0 })}
                className="pl-7 bg-zinc-900 border-zinc-700"
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block flex items-center gap-1">
              <Clock className="w-3 h-3" /> Est. Hours
            </label>
            <Input
              type="number"
              value={localItem.estimated_hours || ''}
              onChange={(e) => setLocalItem({ ...localItem, estimated_hours: parseInt(e.target.value) || null })}
              className="bg-zinc-900 border-zinc-700"
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button size="sm" onClick={handleSave} className="bg-cyan-500 hover:bg-cyan-600">
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
    <div className="p-3 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-all group">
      <div className="flex items-center gap-3">
        <GripVertical className="w-4 h-4 text-zinc-600 cursor-grab flex-shrink-0" />

        <div className={cn("w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0", colorClass)}>
          <CategoryIcon className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">{item.name}</span>
            <Badge variant="outline" className={cn("text-xs", colorClass)}>
              {category.label}
            </Badge>
          </div>
          {item.description && (
            <p className="text-sm text-zinc-500 mt-0.5 truncate">{item.description}</p>
          )}
        </div>

        <div className="text-right flex-shrink-0">
          <div className="text-lg font-semibold text-white">
            {formatPrice(item.amount, currency)}
          </div>
          {item.estimated_hours && (
            <div className="text-xs text-zinc-500">
              ~{item.estimated_hours}h
            </div>
          )}
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

export default function OneTimePricingEditor({
  items = [],
  currency = 'EUR',
  onItemsChange
}) {
  const [editingId, setEditingId] = useState(null);

  const handleAddItem = () => {
    const newItem = {
      ...DEFAULT_ITEM,
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
    toast.success('Item deleted');
  };

  // Group by category for display
  const groupedItems = items.reduce((acc, item) => {
    const cat = item.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const totalRevenue = items.reduce((sum, item) => sum + (item.amount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      {items.length > 0 && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-white/5">
          <span className="text-sm text-zinc-400">
            {items.length} one-time {items.length === 1 ? 'service' : 'services'}
          </span>
          <span className="text-sm font-medium text-white">
            Total: {formatPrice(totalRevenue, currency)}
          </span>
        </div>
      )}

      {/* Items List */}
      {items.length === 0 ? (
        <div className="text-center py-8 rounded-lg border border-dashed border-white/10">
          <Zap className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-sm text-zinc-500 mb-3">No one-time services yet</p>
          <p className="text-xs text-zinc-600 mb-4">
            Add setup fees, migrations, consultancy, or other one-time services
          </p>
          <Button variant="outline" onClick={handleAddItem} className="border-white/10">
            <Plus className="w-4 h-4 mr-2" /> Add Service
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <ItemRow
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
            Add Service
          </Button>
        </div>
      )}
    </div>
  );
}
