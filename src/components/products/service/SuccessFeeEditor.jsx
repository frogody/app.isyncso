import React from 'react';
import { Trophy, Euro, Percent, Target } from 'lucide-react';
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

export default function SuccessFeeEditor({
  config = {},
  currency = 'EUR',
  onConfigChange,
}) {
  const { t } = useTheme();

  const baseFee = config.base_fee || 0;
  const successPercentage = config.success_percentage || 0;
  const metric = config.metric || '';

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
        <div className="w-8 h-8 rounded-lg border flex items-center justify-center bg-blue-500/10 border-blue-500/30 text-blue-400">
          <Trophy className="w-4 h-4" />
        </div>
        <div>
          <h4 className={cn("text-sm font-medium", t('text-slate-900', 'text-white'))}>
            Success Fee
          </h4>
          <p className={cn("text-xs", t('text-slate-500', 'text-zinc-500'))}>
            Base fee plus performance-based compensation
          </p>
        </div>
      </div>

      {/* Fields */}
      <div className="grid grid-cols-3 gap-3">
        {/* Base Fee */}
        <div>
          <label className={cn("text-xs mb-1 block", t('text-slate-500', 'text-zinc-500'))}>
            Base Fee
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
              value={baseFee || ''}
              onChange={(e) => updateField('base_fee', parseFloat(e.target.value) || 0)}
              className={cn(
                "pl-7",
                t('bg-slate-50 border-slate-200', 'bg-zinc-900 border-zinc-700')
              )}
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Success Percentage */}
        <div>
          <label className={cn("text-xs mb-1 block", t('text-slate-500', 'text-zinc-500'))}>
            Success Fee %
          </label>
          <div className="relative">
            <Input
              type="number"
              step="0.5"
              min="0"
              max="100"
              value={successPercentage || ''}
              onChange={(e) => updateField('success_percentage', parseFloat(e.target.value) || 0)}
              className={cn(
                "pr-7",
                t('bg-slate-50 border-slate-200', 'bg-zinc-900 border-zinc-700')
              )}
              placeholder="0"
            />
            <span className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 text-sm",
              t('text-slate-400', 'text-zinc-500')
            )}>
              %
            </span>
          </div>
        </div>

        {/* Metric */}
        <div>
          <label className={cn("text-xs mb-1 block", t('text-slate-500', 'text-zinc-500'))}>
            Success Metric
          </label>
          <Input
            value={metric}
            onChange={(e) => updateField('metric', e.target.value)}
            className={cn(
              t('bg-slate-50 border-slate-200', 'bg-zinc-900 border-zinc-700')
            )}
            placeholder="e.g., placement"
          />
        </div>
      </div>

      {/* Summary Card */}
      {(baseFee > 0 || successPercentage > 0) && (
        <div className={cn(
          "p-3 rounded-lg border space-y-2",
          t('bg-slate-50 border-slate-200', 'bg-zinc-900/50 border-white/5')
        )}>
          <div className={cn("text-xs font-medium uppercase tracking-wider", t('text-slate-500', 'text-zinc-500'))}>
            Fee Structure
          </div>

          {baseFee > 0 && (
            <div className="flex items-center justify-between">
              <span className={cn("text-xs flex items-center gap-1", t('text-slate-500', 'text-zinc-500'))}>
                <Euro className="w-3 h-3" /> Base fee
              </span>
              <span className={cn("text-sm font-semibold", t('text-slate-900', 'text-white'))}>
                {formatPrice(baseFee, currency)}
              </span>
            </div>
          )}

          {successPercentage > 0 && (
            <div className="flex items-center justify-between">
              <span className={cn("text-xs flex items-center gap-1", t('text-slate-500', 'text-zinc-500'))}>
                <Percent className="w-3 h-3" /> Success fee
              </span>
              <span className="text-sm font-semibold text-cyan-400">
                {successPercentage}%
              </span>
            </div>
          )}

          {metric && (
            <div className="flex items-center justify-between">
              <span className={cn("text-xs flex items-center gap-1", t('text-slate-500', 'text-zinc-500'))}>
                <Target className="w-3 h-3" /> Metric
              </span>
              <span className={cn("text-sm", t('text-slate-700', 'text-zinc-300'))}>
                {metric}
              </span>
            </div>
          )}

          <div className={cn(
            "pt-2 mt-1 border-t",
            t('border-slate-200', 'border-white/5')
          )}>
            <p className={cn("text-xs leading-relaxed", t('text-slate-500', 'text-zinc-500'))}>
              {baseFee > 0 && successPercentage > 0 && metric
                ? `${formatPrice(baseFee, currency)} upfront + ${successPercentage}% of ${metric}`
                : baseFee > 0 && successPercentage > 0
                  ? `${formatPrice(baseFee, currency)} upfront + ${successPercentage}% on success`
                  : baseFee > 0
                    ? `${formatPrice(baseFee, currency)} flat fee`
                    : `${successPercentage}% of ${metric || 'success metric'}`
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
