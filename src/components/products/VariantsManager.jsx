import React, { useState } from 'react';
import {
  Layers, Plus, Trash2, Edit2, Check, X, ChevronDown,
  ChevronUp, GripVertical, Package, Euro, Image
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const PRESET_ATTRIBUTES = [
  { name: 'Size', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
  { name: 'Color', options: ['Black', 'White', 'Blue', 'Red', 'Green'] },
  { name: 'Material', options: ['Cotton', 'Polyester', 'Leather', 'Metal', 'Plastic'] },
  { name: 'Style', options: ['Classic', 'Modern', 'Vintage', 'Sport'] },
];

function VariantRow({ variant, index, basePrice, currency, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [localVariant, setLocalVariant] = useState(variant);

  const handleSave = () => {
    onUpdate(index, localVariant);
    setIsEditing(false);
    toast.success('Variant updated');
  };

  const handleCancel = () => {
    setLocalVariant(variant);
    setIsEditing(false);
  };

  const priceDiff = variant.price_adjustment || 0;
  const effectivePrice = basePrice + priceDiff;

  if (isEditing) {
    return (
      <div className="p-4 rounded-lg bg-zinc-800/50 border border-cyan-500/30 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Variant Name</label>
            <Input
              value={localVariant.name}
              onChange={(e) => setLocalVariant({ ...localVariant, name: e.target.value })}
              placeholder="e.g., Large - Blue"
              className="bg-zinc-900 border-zinc-700"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">SKU Suffix</label>
            <Input
              value={localVariant.sku_suffix || ''}
              onChange={(e) => setLocalVariant({ ...localVariant, sku_suffix: e.target.value })}
              placeholder="e.g., -LG-BL"
              className="bg-zinc-900 border-zinc-700"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Price Adjustment</label>
            <Input
              type="number"
              step="0.01"
              value={localVariant.price_adjustment || 0}
              onChange={(e) => setLocalVariant({ ...localVariant, price_adjustment: parseFloat(e.target.value) || 0 })}
              className="bg-zinc-900 border-zinc-700"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Stock</label>
            <Input
              type="number"
              value={localVariant.stock || 0}
              onChange={(e) => setLocalVariant({ ...localVariant, stock: parseInt(e.target.value) || 0 })}
              className="bg-zinc-900 border-zinc-700"
            />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch
                checked={localVariant.is_active !== false}
                onCheckedChange={(checked) => setLocalVariant({ ...localVariant, is_active: checked })}
              />
              <span className="text-sm text-zinc-400">Active</span>
            </label>
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
    <div className={cn(
      "p-3 rounded-lg border transition-all group",
      variant.is_active === false
        ? "bg-zinc-900/30 border-white/5 opacity-60"
        : "bg-zinc-900/50 border-white/5 hover:border-white/10"
    )}>
      <div className="flex items-center gap-3">
        <GripVertical className="w-4 h-4 text-zinc-600 cursor-grab" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">{variant.name}</span>
            {variant.sku_suffix && (
              <Badge variant="outline" className="border-white/10 text-zinc-500 text-xs">
                {variant.sku_suffix}
              </Badge>
            )}
            {variant.is_active === false && (
              <Badge variant="outline" className="border-red-500/30 text-red-400 text-xs">
                Inactive
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="text-center">
            <span className="text-zinc-500 text-xs block">Price</span>
            <span className={cn(
              "font-medium",
              priceDiff > 0 ? "text-cyan-400" : priceDiff < 0 ? "text-cyan-400" : "text-white"
            )}>
              {priceDiff !== 0 && (priceDiff > 0 ? '+' : '')}
              {'€'}{priceDiff.toFixed(2)}
            </span>
          </div>

          <div className="text-center">
            <span className="text-zinc-500 text-xs block">Stock</span>
            <span className={cn(
              "font-medium",
              variant.stock <= 0 ? "text-red-400" : variant.stock <= 10 ? "text-zinc-400" : "text-white"
            )}>
              {variant.stock || 0}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-zinc-400 hover:text-white"
            onClick={() => setIsEditing(true)}
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
      </div>
    </div>
  );
}

export default function VariantsManager({
  variants = [],
  basePrice = 0,
  currency = 'EUR',
  onVariantsChange,
  className
}) {
  const [isOpen, setIsOpen] = useState(true);

  const handleAddVariant = () => {
    const newVariant = {
      name: `Variant ${variants.length + 1}`,
      sku_suffix: '',
      price_adjustment: 0,
      stock: 0,
      is_active: true,
      attributes: {}
    };
    onVariantsChange?.([...variants, newVariant]);
  };

  const handleUpdateVariant = (index, updatedVariant) => {
    const newVariants = [...variants];
    newVariants[index] = updatedVariant;
    onVariantsChange?.(newVariants);
  };

  const handleDeleteVariant = (index) => {
    const newVariants = variants.filter((_, i) => i !== index);
    onVariantsChange?.(newVariants);
    toast.success('Variant removed');
  };

  const totalStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);
  const activeVariants = variants.filter(v => v.is_active !== false).length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-900/50 border border-white/5 cursor-pointer hover:bg-zinc-900/70 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
              <Layers className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-medium text-white">Product Variants</h3>
              <p className="text-xs text-zinc-500">
                {variants.length} variant{variants.length !== 1 ? 's' : ''} • {activeVariants} active • {totalStock} total stock
              </p>
            </div>
          </div>
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-zinc-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-zinc-400" />
          )}
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-3 space-y-2">
          {variants.length === 0 ? (
            <div className="text-center py-6 rounded-lg border border-dashed border-white/10">
              <Layers className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm text-zinc-500">No variants yet</p>
              <p className="text-xs text-zinc-600 mb-3">Add variants for different sizes, colors, or options</p>
              <Button
                size="sm"
                variant="outline"
                className="border-white/10 text-zinc-300"
                onClick={handleAddVariant}
              >
                <Plus className="w-4 h-4 mr-1" /> Add First Variant
              </Button>
            </div>
          ) : (
            <>
              {variants.map((variant, index) => (
                <VariantRow
                  key={variant.id || index}
                  variant={variant}
                  index={index}
                  basePrice={basePrice}
                  currency={currency}
                  onUpdate={handleUpdateVariant}
                  onDelete={handleDeleteVariant}
                />
              ))}

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-zinc-400 hover:text-white hover:bg-white/5 border border-dashed border-white/10"
                onClick={handleAddVariant}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Variant
              </Button>
            </>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
