import React from 'react';
import { Plus, X, Flag, Percent, Euro } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  return `ms_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;
}

export default function MilestonePricingEditor({
  items = [],
  currency = 'EUR',
  onItemsChange,
}) {
  const { t } = useTheme();

  const handleAddItem = () => {
    const newItem = {
      id: generateItemId(),
      name: '',
      amount: 0,
      is_percentage: false,
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

  // Calculate totals
  const fixedTotal = items
    .filter((m) => !m.is_percentage)
    .reduce((sum, m) => sum + (m.amount || 0), 0);
  const percentageTotal = items
    .filter((m) => m.is_percentage)
    .reduce((sum, m) => sum + (m.amount || 0), 0);

  const percentageValid = percentageTotal <= 100;

  return (
    <div className={cn(
      "p-4 rounded-xl border space-y-4",
      t('bg-white', 'bg-zinc-900/50'),
      t('border-slate-200', 'border-white/5')
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg border flex items-center justify-center bg-cyan-500/10 border-cyan-500/30 text-cyan-400">
            <Flag className="w-4 h-4" />
          </div>
          <div>
            <h4 className={cn("text-sm font-medium", t('text-slate-900', 'text-white'))}>
              Milestone Pricing
            </h4>
            <p className={cn("text-xs", t('text-slate-500', 'text-zinc-500'))}>
              Payment tied to deliverable milestones
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
          Add Milestone
        </Button>
      </div>

      {/* Column Headers */}
      {items.length > 0 && (
        <div className="grid grid-cols-[1fr_140px_80px_32px] gap-2 px-1">
          <span className={cn("text-xs", t('text-slate-500', 'text-zinc-500'))}>
            Milestone
          </span>
          <span className={cn("text-xs", t('text-slate-500', 'text-zinc-500'))}>
            Amount
          </span>
          <span className={cn("text-xs text-center", t('text-slate-500', 'text-zinc-500'))}>
            % Mode
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
          <Flag className={cn("w-8 h-8 mx-auto mb-2", t('text-slate-300', 'text-zinc-600'))} />
          <p className={cn("text-sm mb-3", t('text-slate-500', 'text-zinc-500'))}>
            No milestones yet
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddItem}
            className={cn(t('border-slate-200', 'border-white/10'))}
          >
            <Plus className="w-4 h-4 mr-1" /> Add First Milestone
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={item.id}
              className={cn(
                "grid grid-cols-[1fr_140px_80px_32px] gap-2 items-center p-2 rounded-lg",
                t('bg-slate-50', 'bg-zinc-800/30')
              )}
            >
              <div className="flex items-center gap-2">
                <span className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0",
                  "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                )}>
                  {index + 1}
                </span>
                <Input
                  value={item.name}
                  onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                  placeholder="e.g., Design approval"
                  className={cn(
                    "h-9 text-sm",
                    t('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')
                  )}
                />
              </div>
              <div className="relative">
                <span className={cn(
                  "absolute left-2.5 top-1/2 -translate-y-1/2 text-xs",
                  t('text-slate-400', 'text-zinc-500')
                )}>
                  {item.is_percentage ? '%' : '€'}
                </span>
                <Input
                  type="number"
                  step={item.is_percentage ? '1' : '0.01'}
                  min="0"
                  max={item.is_percentage ? '100' : undefined}
                  value={item.amount || ''}
                  onChange={(e) => handleUpdateItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
                  className={cn(
                    "h-9 text-sm pl-6",
                    t('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')
                  )}
                  placeholder="0"
                />
              </div>
              <div className="flex justify-center">
                <Switch
                  checked={item.is_percentage}
                  onCheckedChange={(checked) => handleUpdateItem(item.id, 'is_percentage', checked)}
                />
              </div>
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

      {/* Summary */}
      {items.length > 0 && (
        <div className={cn(
          "p-3 rounded-lg border space-y-2",
          t('bg-slate-50 border-slate-200', 'bg-zinc-900/50 border-white/5')
        )}>
          {fixedTotal > 0 && (
            <div className="flex items-center justify-between">
              <span className={cn("text-xs flex items-center gap-1", t('text-slate-500', 'text-zinc-500'))}>
                <Euro className="w-3 h-3" /> Fixed amounts
              </span>
              <span className={cn("text-sm font-semibold", t('text-slate-900', 'text-white'))}>
                {formatPrice(fixedTotal, currency)}
              </span>
            </div>
          )}
          {percentageTotal > 0 && (
            <div className="flex items-center justify-between">
              <span className={cn("text-xs flex items-center gap-1", t('text-slate-500', 'text-zinc-500'))}>
                <Percent className="w-3 h-3" /> Percentage milestones
              </span>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-sm font-semibold",
                  percentageValid
                    ? t('text-slate-900', 'text-white')
                    : 'text-red-400'
                )}>
                  {percentageTotal}%
                </span>
                {!percentageValid && (
                  <Badge className="bg-red-500/10 text-red-400 border-red-500/30 text-xs">
                    Exceeds 100%
                  </Badge>
                )}
              </div>
            </div>
          )}
          <div className={cn(
            "pt-2 mt-1 border-t flex items-center justify-between",
            t('border-slate-200', 'border-white/5')
          )}>
            <span className={cn("text-xs", t('text-slate-500', 'text-zinc-500'))}>
              {items.length} {items.length === 1 ? 'milestone' : 'milestones'}
            </span>
            {percentageTotal > 0 && percentageValid && (
              <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 text-xs">
                {percentageTotal}% allocated
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
