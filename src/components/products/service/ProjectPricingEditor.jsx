import React from 'react';
import { Plus, X, FolderKanban, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/GlobalThemeContext';

function formatPrice(amount, currency = 'EUR') {
  if (!amount && amount !== 0) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

function generateItemId() {
  return `proj_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;
}

export default function ProjectPricingEditor({
  items = [],
  currency = 'EUR',
  onItemsChange,
}) {
  const { t } = useTheme();

  const handleAddItem = () => {
    const newItem = {
      id: generateItemId(),
      name: '',
      price: 0,
      est_hours: 0,
    };
    onItemsChange?.([...items, newItem]);
  };

  const handleUpdateItem = (id, field, value) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    );
    onItemsChange?.(updated);
  };

  const handleRemoveItem = (id) => {
    onItemsChange?.(items.filter((item) => item.id !== id));
  };

  const totalPrice = items.reduce((sum, item) => sum + (item.price || 0), 0);
  const totalHours = items.reduce((sum, item) => sum + (item.est_hours || 0), 0);

  return (
    <div className={cn(
      "p-4 rounded-xl border space-y-4",
      t('bg-white', 'bg-zinc-900/50'),
      t('border-slate-200', 'border-white/5')
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg border flex items-center justify-center bg-blue-500/10 border-blue-500/30 text-blue-400">
            <FolderKanban className="w-4 h-4" />
          </div>
          <div>
            <h4 className={cn("text-sm font-medium", t('text-slate-900', 'text-white'))}>
              Project Pricing
            </h4>
            <p className={cn("text-xs", t('text-slate-500', 'text-zinc-500'))}>
              Fixed-price deliverables
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleAddItem}
          className={cn(
            "h-8",
            t('border-slate-200 hover:bg-slate-50', 'border-white/10 hover:bg-white/5')
          )}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Item
        </Button>
      </div>

      {/* Column Headers */}
      {items.length > 0 && (
        <div className="grid grid-cols-[1fr_120px_100px_32px] gap-2 px-1">
          <span className={cn("text-xs", t('text-slate-500', 'text-zinc-500'))}>
            Deliverable
          </span>
          <span className={cn("text-xs", t('text-slate-500', 'text-zinc-500'))}>
            Price
          </span>
          <span className={cn("text-xs flex items-center gap-1", t('text-slate-500', 'text-zinc-500'))}>
            <Clock className="w-3 h-3" /> Est. Hours
          </span>
          <span />
        </div>
      )}

      {/* Items */}
      {items.length === 0 ? (
        <div className={cn(
          "text-center py-6 rounded-lg border border-dashed",
          t('border-slate-200', 'border-white/10')
        )}>
          <FolderKanban className={cn("w-8 h-8 mx-auto mb-2", t('text-slate-300', 'text-zinc-600'))} />
          <p className={cn("text-sm mb-3", t('text-slate-500', 'text-zinc-500'))}>
            No project items yet
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddItem}
            className={cn(t('border-slate-200', 'border-white/10'))}
          >
            <Plus className="w-4 h-4 mr-1" /> Add First Item
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[1fr_120px_100px_32px] gap-2 items-center"
            >
              <Input
                value={item.name}
                onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                placeholder="e.g., Discovery phase"
                className={cn(
                  "h-9 text-sm",
                  t('bg-slate-50 border-slate-200', 'bg-zinc-900 border-zinc-700')
                )}
              />
              <div className="relative">
                <span className={cn(
                  "absolute left-2.5 top-1/2 -translate-y-1/2 text-xs",
                  t('text-slate-400', 'text-zinc-500')
                )}>
                  {'€'}
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.price || ''}
                  onChange={(e) => handleUpdateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                  className={cn(
                    "h-9 text-sm pl-6",
                    t('bg-slate-50 border-slate-200', 'bg-zinc-900 border-zinc-700')
                  )}
                  placeholder="0.00"
                />
              </div>
              <Input
                type="number"
                step="1"
                min="0"
                value={item.est_hours || ''}
                onChange={(e) => handleUpdateItem(item.id, 'est_hours', parseInt(e.target.value) || 0)}
                className={cn(
                  "h-9 text-sm",
                  t('bg-slate-50 border-slate-200', 'bg-zinc-900 border-zinc-700')
                )}
                placeholder="0"
              />
              <Button
                size="icon"
                variant="ghost"
                className={cn("h-8 w-8", t('text-slate-400 hover:text-red-500', 'text-zinc-400 hover:text-red-400'))}
                onClick={() => handleRemoveItem(item.id)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Total */}
      {items.length > 0 && (
        <div className={cn(
          "flex items-center justify-between p-3 rounded-lg border",
          t('bg-slate-50 border-slate-200', 'bg-zinc-900/50 border-white/5')
        )}>
          <div className="flex items-center gap-4">
            <span className={cn("text-sm font-medium", t('text-slate-700', 'text-zinc-300'))}>
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
            {totalHours > 0 && (
              <span className={cn("text-xs flex items-center gap-1", t('text-slate-500', 'text-zinc-500'))}>
                <Clock className="w-3 h-3" /> {totalHours}h estimated
              </span>
            )}
          </div>
          <div className="text-right">
            <span className={cn("text-xs", t('text-slate-500', 'text-zinc-500'))}>Total </span>
            <span className={cn("text-sm font-semibold", t('text-slate-900', 'text-white'))}>
              {formatPrice(totalPrice, currency)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
