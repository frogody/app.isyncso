import React, { useState } from 'react';
import {
  DollarSign, Plus, Trash2, TrendingDown, Percent,
  Edit2, Check, X, Calculator, Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function formatPrice(price, currency = 'EUR') {
  if (!price && price !== 0) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(price);
}

function TierRow({ tier, index, basePrice, currency, onUpdate, onDelete, isEditing, setEditingIndex }) {
  const [localTier, setLocalTier] = useState(tier);
  const discount = basePrice > 0 ? ((basePrice - tier.price) / basePrice * 100).toFixed(1) : 0;

  const handleSave = () => {
    onUpdate(index, localTier);
    setEditingIndex(null);
    toast.success('Tier updated');
  };

  const handleCancel = () => {
    setLocalTier(tier);
    setEditingIndex(null);
  };

  if (isEditing) {
    return (
      <tr className="border-b border-white/5">
        <td className="py-3 px-4">
          <Input
            type="number"
            value={localTier.min_quantity}
            onChange={(e) => setLocalTier({ ...localTier, min_quantity: parseInt(e.target.value) || 0 })}
            className="w-20 h-8 bg-zinc-800 border-orange-500/50 text-white text-sm"
          />
        </td>
        <td className="py-3 px-4">
          <Input
            type="number"
            value={localTier.max_quantity || ''}
            onChange={(e) => setLocalTier({ ...localTier, max_quantity: e.target.value ? parseInt(e.target.value) : null })}
            placeholder="∞"
            className="w-20 h-8 bg-zinc-800 border-orange-500/50 text-white text-sm"
          />
        </td>
        <td className="py-3 px-4">
          <Input
            type="number"
            step="0.01"
            value={localTier.price}
            onChange={(e) => setLocalTier({ ...localTier, price: parseFloat(e.target.value) || 0 })}
            className="w-24 h-8 bg-zinc-800 border-orange-500/50 text-white text-sm"
          />
        </td>
        <td className="py-3 px-4 text-green-400 text-sm">-{discount}%</td>
        <td className="py-3 px-4">
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7 text-green-400" onClick={handleSave}>
              <Check className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400" onClick={handleCancel}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-white/5 hover:bg-white/2 group">
      <td className="py-3 px-4 text-white">{tier.min_quantity}</td>
      <td className="py-3 px-4 text-zinc-400">{tier.max_quantity || '∞'}</td>
      <td className="py-3 px-4 text-white font-medium">{formatPrice(tier.price, currency)}</td>
      <td className="py-3 px-4">
        {discount > 0 && (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            -{discount}%
          </Badge>
        )}
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-zinc-400 hover:text-white"
            onClick={() => setEditingIndex(index)}
          >
            <Edit2 className="w-3 h-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-zinc-400 hover:text-red-400"
            onClick={() => onDelete(index)}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

export default function PricingTiers({
  tiers = [],
  basePrice = 0,
  costPrice = 0,
  currency = 'EUR',
  onTiersChange,
  className
}) {
  const [editingIndex, setEditingIndex] = useState(null);

  const handleAddTier = () => {
    const lastTier = tiers[tiers.length - 1];
    const newTier = {
      min_quantity: lastTier ? (lastTier.max_quantity || lastTier.min_quantity) + 1 : 1,
      max_quantity: null,
      price: basePrice * 0.9, // Default 10% discount
    };

    if (lastTier && !lastTier.max_quantity) {
      // Update last tier's max_quantity
      const updatedTiers = [...tiers];
      updatedTiers[updatedTiers.length - 1] = {
        ...lastTier,
        max_quantity: newTier.min_quantity - 1
      };
      onTiersChange?.([...updatedTiers, newTier]);
    } else {
      onTiersChange?.([...tiers, newTier]);
    }
    setEditingIndex(tiers.length);
  };

  const handleUpdateTier = (index, updatedTier) => {
    const newTiers = [...tiers];
    newTiers[index] = updatedTier;
    onTiersChange?.(newTiers);
  };

  const handleDeleteTier = (index) => {
    const newTiers = tiers.filter((_, i) => i !== index);
    onTiersChange?.(newTiers);
    toast.success('Tier removed');
  };

  // Calculate margin
  const margin = basePrice > 0 && costPrice > 0
    ? ((basePrice - costPrice) / basePrice * 100).toFixed(1)
    : null;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-zinc-900/50 border border-white/5">
          <div className="flex items-center gap-2 text-zinc-500 mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs">Base Price</span>
          </div>
          <p className="text-lg font-semibold text-white">{formatPrice(basePrice, currency)}</p>
        </div>

        <div className="p-3 rounded-lg bg-zinc-900/50 border border-white/5">
          <div className="flex items-center gap-2 text-zinc-500 mb-1">
            <Calculator className="w-4 h-4" />
            <span className="text-xs">Cost</span>
          </div>
          <p className="text-lg font-semibold text-white">{formatPrice(costPrice, currency)}</p>
        </div>

        <div className="p-3 rounded-lg bg-zinc-900/50 border border-white/5">
          <div className="flex items-center gap-2 text-zinc-500 mb-1">
            <TrendingDown className="w-4 h-4" />
            <span className="text-xs">Margin</span>
          </div>
          <p className={cn(
            "text-lg font-semibold",
            margin > 30 ? "text-green-400" : margin > 15 ? "text-amber-400" : "text-red-400"
          )}>
            {margin ? `${margin}%` : '-'}
          </p>
        </div>

        <div className="p-3 rounded-lg bg-zinc-900/50 border border-white/5">
          <div className="flex items-center gap-2 text-zinc-500 mb-1">
            <Package className="w-4 h-4" />
            <span className="text-xs">Price Tiers</span>
          </div>
          <p className="text-lg font-semibold text-white">{tiers.length}</p>
        </div>
      </div>

      {/* Tiers Table */}
      <div className="rounded-lg border border-white/5 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-zinc-900/80 border-b border-white/5">
              <th className="text-left py-2 px-4 text-xs font-medium text-zinc-500 uppercase">Min Qty</th>
              <th className="text-left py-2 px-4 text-xs font-medium text-zinc-500 uppercase">Max Qty</th>
              <th className="text-left py-2 px-4 text-xs font-medium text-zinc-500 uppercase">Unit Price</th>
              <th className="text-left py-2 px-4 text-xs font-medium text-zinc-500 uppercase">Discount</th>
              <th className="py-2 px-4 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {/* Base price row */}
            <tr className="border-b border-white/5 bg-orange-500/5">
              <td className="py-3 px-4 text-white">1</td>
              <td className="py-3 px-4 text-zinc-400">{tiers.length > 0 ? tiers[0].min_quantity - 1 : '∞'}</td>
              <td className="py-3 px-4 text-white font-medium">{formatPrice(basePrice, currency)}</td>
              <td className="py-3 px-4">
                <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30">Base</Badge>
              </td>
              <td className="py-3 px-4"></td>
            </tr>

            {/* Tier rows */}
            {tiers.map((tier, index) => (
              <TierRow
                key={index}
                tier={tier}
                index={index}
                basePrice={basePrice}
                currency={currency}
                onUpdate={handleUpdateTier}
                onDelete={handleDeleteTier}
                isEditing={editingIndex === index}
                setEditingIndex={setEditingIndex}
              />
            ))}
          </tbody>
        </table>

        {/* Add Tier Button */}
        <div className="p-2 bg-zinc-900/50">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-zinc-400 hover:text-white hover:bg-white/5"
            onClick={handleAddTier}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Volume Tier
          </Button>
        </div>
      </div>

      {/* Help Text */}
      <p className="text-xs text-zinc-600">
        Volume pricing applies automatically when order quantity meets the tier threshold.
      </p>
    </div>
  );
}
