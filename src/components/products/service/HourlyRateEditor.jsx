import React from 'react';
import { Clock, Euro } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/GlobalThemeContext';

function formatPrice(amount, currency = 'EUR') {
  if (!amount && amount !== 0) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

const BILLING_INCREMENTS = [
  { value: '15min', label: '15 minutes' },
  { value: '30min', label: '30 minutes' },
  { value: '1hr', label: '1 hour' },
];

export default function HourlyRateEditor({
  config = {},
  currency = 'EUR',
  onConfigChange,
}) {
  const { t } = useTheme();

  const rate = config.rate || 0;
  const minHours = config.min_hours || 0;
  const billingIncrement = config.billing_increment || '1hr';

  const updateField = (field, value) => {
    onConfigChange?.({
      ...config,
      [field]: value,
    });
  };

  return (
    <div className={cn(
      "p-4 rounded-xl border space-y-4",
      t('bg-white', 'bg-zinc-900/50'),
      t('border-slate-200', 'border-white/5')
    )}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg border flex items-center justify-center bg-cyan-500/10 border-cyan-500/30 text-cyan-400">
          <Clock className="w-4 h-4" />
        </div>
        <div>
          <h4 className={cn("text-sm font-medium", t('text-slate-900', 'text-white'))}>
            Hourly Rate
          </h4>
          <p className={cn("text-xs", t('text-slate-500', 'text-zinc-500'))}>
            Charge by the hour with minimum billing
          </p>
        </div>
      </div>

      {/* Fields */}
      <div className="grid grid-cols-3 gap-3">
        {/* Rate */}
        <div>
          <label className={cn("text-xs mb-1 block", t('text-slate-500', 'text-zinc-500'))}>
            Hourly Rate
          </label>
          <div className="relative">
            <span className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 text-sm",
              t('text-slate-400', 'text-zinc-500')
            )}>
              {'€'}
            </span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={rate || ''}
              onChange={(e) => updateField('rate', parseFloat(e.target.value) || 0)}
              className={cn(
                "pl-7",
                t('bg-slate-50 border-slate-200', 'bg-zinc-900 border-zinc-700')
              )}
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Min Hours */}
        <div>
          <label className={cn("text-xs mb-1 block", t('text-slate-500', 'text-zinc-500'))}>
            Min. Hours
          </label>
          <Input
            type="number"
            step="0.5"
            min="0"
            value={minHours || ''}
            onChange={(e) => updateField('min_hours', parseFloat(e.target.value) || 0)}
            className={cn(
              t('bg-slate-50 border-slate-200', 'bg-zinc-900 border-zinc-700')
            )}
            placeholder="0"
          />
        </div>

        {/* Billing Increment */}
        <div>
          <label className={cn("text-xs mb-1 block", t('text-slate-500', 'text-zinc-500'))}>
            Billing Increment
          </label>
          <Select
            value={billingIncrement}
            onValueChange={(val) => updateField('billing_increment', val)}
          >
            <SelectTrigger className={cn(
              t('bg-slate-50 border-slate-200', 'bg-zinc-900 border-zinc-700')
            )}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BILLING_INCREMENTS.map((inc) => (
                <SelectItem key={inc.value} value={inc.value}>
                  {inc.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary */}
      {rate > 0 && (
        <div className={cn(
          "flex items-center justify-between p-3 rounded-lg border",
          t('bg-slate-50 border-slate-200', 'bg-zinc-900/50 border-white/5')
        )}>
          <span className={cn("text-xs", t('text-slate-500', 'text-zinc-500'))}>
            Effective rate
          </span>
          <div className="flex items-center gap-2">
            <span className={cn("text-sm font-semibold", t('text-slate-900', 'text-white'))}>
              {formatPrice(rate, currency)}/hr
            </span>
            {minHours > 0 && (
              <span className={cn("text-xs", t('text-slate-400', 'text-zinc-500'))}>
                (min {minHours}h = {formatPrice(rate * minHours, currency)})
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
