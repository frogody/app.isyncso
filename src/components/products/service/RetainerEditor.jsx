import React from 'react';
import { RefreshCw, Euro, Clock } from 'lucide-react';
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

export default function RetainerEditor({
  config = {},
  currency = 'EUR',
  onConfigChange,
}) {
  const { t } = useTheme();

  const monthlyFee = config.monthly_fee || 0;
  const includedHours = config.included_hours || 0;
  const overageRate = config.overage_rate || 0;

  const updateField = (field, value) => {
    onConfigChange?.({
      ...config,
      [field]: value,
    });
  };

  const effectiveHourlyRate = includedHours > 0 ? monthlyFee / includedHours : 0;

  return (
    <div className={cn(
      "p-4 rounded-xl border space-y-4",
      t('bg-white', 'bg-zinc-900/50'),
      t('border-slate-200', 'border-white/5')
    )}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg border flex items-center justify-center bg-cyan-500/10 border-cyan-500/30 text-cyan-400">
          <RefreshCw className="w-4 h-4" />
        </div>
        <div>
          <h4 className={cn("text-sm font-medium", t('text-slate-900', 'text-white'))}>
            Retainer
          </h4>
          <p className={cn("text-xs", t('text-slate-500', 'text-zinc-500'))}>
            Monthly fee with included hours and overage billing
          </p>
        </div>
      </div>

      {/* Fields */}
      <div className="grid grid-cols-3 gap-3">
        {/* Monthly Fee */}
        <div>
          <label className={cn("text-xs mb-1 block", t('text-slate-500', 'text-zinc-500'))}>
            Monthly Fee
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
              value={monthlyFee || ''}
              onChange={(e) => updateField('monthly_fee', parseFloat(e.target.value) || 0)}
              className={cn(
                "pl-7",
                t('bg-slate-50 border-slate-200', 'bg-zinc-900 border-zinc-700')
              )}
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Included Hours */}
        <div>
          <label className={cn("text-xs mb-1 block", t('text-slate-500', 'text-zinc-500'))}>
            Included Hours
          </label>
          <Input
            type="number"
            step="1"
            min="0"
            value={includedHours || ''}
            onChange={(e) => updateField('included_hours', parseInt(e.target.value) || 0)}
            className={cn(
              t('bg-slate-50 border-slate-200', 'bg-zinc-900 border-zinc-700')
            )}
            placeholder="0"
          />
        </div>

        {/* Overage Rate */}
        <div>
          <label className={cn("text-xs mb-1 block", t('text-slate-500', 'text-zinc-500'))}>
            Overage Rate/hr
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
              value={overageRate || ''}
              onChange={(e) => updateField('overage_rate', parseFloat(e.target.value) || 0)}
              className={cn(
                "pl-7",
                t('bg-slate-50 border-slate-200', 'bg-zinc-900 border-zinc-700')
              )}
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      {/* Monthly Summary Card */}
      {monthlyFee > 0 && (
        <div className={cn(
          "p-3 rounded-lg border space-y-2",
          t('bg-slate-50 border-slate-200', 'bg-zinc-900/50 border-white/5')
        )}>
          <div className="flex items-center justify-between">
            <span className={cn("text-xs", t('text-slate-500', 'text-zinc-500'))}>
              Monthly fee
            </span>
            <span className={cn("text-sm font-semibold", t('text-slate-900', 'text-white'))}>
              {formatPrice(monthlyFee, currency)}/mo
            </span>
          </div>
          {includedHours > 0 && (
            <>
              <div className="flex items-center justify-between">
                <span className={cn("text-xs flex items-center gap-1", t('text-slate-500', 'text-zinc-500'))}>
                  <Clock className="w-3 h-3" /> Included hours
                </span>
                <span className={cn("text-sm", t('text-slate-700', 'text-zinc-300'))}>
                  {includedHours}h
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={cn("text-xs", t('text-slate-500', 'text-zinc-500'))}>
                  Effective rate (included)
                </span>
                <span className="text-sm text-cyan-400 font-medium">
                  {formatPrice(effectiveHourlyRate, currency)}/hr
                </span>
              </div>
            </>
          )}
          {overageRate > 0 && (
            <div className="flex items-center justify-between">
              <span className={cn("text-xs", t('text-slate-500', 'text-zinc-500'))}>
                Beyond {includedHours}h
              </span>
              <span className={cn("text-sm", t('text-slate-700', 'text-zinc-300'))}>
                {formatPrice(overageRate, currency)}/hr
              </span>
            </div>
          )}
          <div className={cn(
            "pt-2 mt-2 flex items-center justify-between border-t",
            t('border-slate-200', 'border-white/5')
          )}>
            <span className={cn("text-xs", t('text-slate-500', 'text-zinc-500'))}>
              Annual value
            </span>
            <span className={cn("text-sm font-semibold", t('text-slate-900', 'text-white'))}>
              {formatPrice(monthlyFee * 12, currency)}/yr
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
