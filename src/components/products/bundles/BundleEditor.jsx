import React, { useState, useEffect } from 'react';
import {
  X, Save, Plus, Trash2, Search, Package, Layers,
  DollarSign, Percent, GripVertical, Check, AlertCircle,
  CreditCard, Zap, ChevronDown, ChevronUp, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

function generateItemId() {
  return `item_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;
}

const DEFAULT_BUNDLE = {
  name: '',
  description: '',
  bundle_type: 'fixed',
  pricing_strategy: 'sum',
  fixed_price: 0,
  discount_percent: 0,
  items: [],
  status: 'draft'
};

function ProductSearchModal({ open, onClose, onSelect, currency, existingIds = [] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  // In a real implementation, this would fetch from the API
  // For now, we'll show a placeholder UI
  useEffect(() => {
    if (open) {
      setSearchQuery('');
      // Simulated products - replace with actual API call
      setProducts([]);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-zinc-900 border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-cyan-400" />
            Add Products to Bundle
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products by name or SKU..."
              className="pl-9 bg-zinc-800 border-white/10"
            />
          </div>

          {/* Product List */}
          <div className="max-h-80 overflow-y-auto space-y-2">
            {products.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                <p className="text-sm text-zinc-500">
                  {searchQuery ? 'No products found' : 'Search for products to add'}
                </p>
                <p className="text-xs text-zinc-600 mt-1">
                  Type a product name or SKU to search
                </p>
              </div>
            ) : (
              products.map(product => {
                const isAlreadyAdded = existingIds.includes(product.id);
                return (
                  <div
                    key={product.id}
                    className={cn(
                      "p-3 rounded-lg border transition-all cursor-pointer",
                      isAlreadyAdded
                        ? "bg-zinc-800/50 border-white/5 opacity-50 cursor-not-allowed"
                        : "bg-zinc-800/50 border-white/10 hover:border-cyan-500/30"
                    )}
                    onClick={() => !isAlreadyAdded && onSelect(product)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-zinc-700 flex items-center justify-center">
                        <Package className="w-5 h-5 text-zinc-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white truncate">{product.name}</div>
                        <div className="text-xs text-zinc-500">{product.sku || 'No SKU'}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-white">
                          {formatPrice(product.price, currency)}
                        </div>
                        {isAlreadyAdded && (
                          <Badge variant="outline" className="text-xs bg-zinc-700/50">
                            Already added
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BundleItemRow({ item, currency, onUpdate, onRemove }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 border border-white/5 group">
      <GripVertical className="w-4 h-4 text-zinc-600 cursor-grab flex-shrink-0" />

      <div className="w-10 h-10 rounded-lg bg-zinc-700 flex items-center justify-center flex-shrink-0">
        {item.product_type === 'digital' ? (
          <Zap className="w-5 h-5 text-cyan-400" />
        ) : (
          <Package className="w-5 h-5 text-zinc-400" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-medium text-white truncate">{item.name || 'Unknown Product'}</div>
        {item.plan_name && (
          <div className="text-xs text-cyan-400">{item.plan_name}</div>
        )}
      </div>

      {/* Quantity */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500">Qty:</span>
        <Input
          type="number"
          min="1"
          value={item.quantity || 1}
          onChange={(e) => onUpdate({ ...item, quantity: parseInt(e.target.value) || 1 })}
          className="w-16 h-8 text-center bg-zinc-900 border-white/10 text-sm"
        />
      </div>

      {/* Price */}
      <div className="text-right w-24 flex-shrink-0">
        <div className="font-medium text-white">
          {formatPrice((item.price || 0) * (item.quantity || 1), currency)}
        </div>
        {item.quantity > 1 && (
          <div className="text-xs text-zinc-500">
            {formatPrice(item.price, currency)} each
          </div>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-400"
        onClick={() => onRemove(item.id)}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

export default function BundleEditor({
  bundle = null,
  currency = 'EUR',
  onSave,
  onCancel,
  saving = false,
  className
}) {
  const [formData, setFormData] = useState(bundle || DEFAULT_BUNDLE);
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(true);
  const [errors, setErrors] = useState({});

  const isEditing = !!bundle?.id;

  // Calculate totals
  const itemsTotal = formData.items?.reduce((sum, item) =>
    sum + (item.price || 0) * (item.quantity || 1), 0) || 0;

  const finalPrice = formData.pricing_strategy === 'fixed'
    ? formData.fixed_price || 0
    : formData.pricing_strategy === 'discount'
      ? itemsTotal * (1 - (formData.discount_percent || 0) / 100)
      : itemsTotal;

  const savings = itemsTotal - finalPrice;
  const savingsPercent = itemsTotal > 0 ? (savings / itemsTotal) * 100 : 0;

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleAddProduct = (product) => {
    const newItem = {
      id: generateItemId(),
      product_id: product.id,
      product_type: product.type || 'physical',
      name: product.name,
      sku: product.sku,
      price: product.price || 0,
      quantity: 1,
      plan_id: null,
      plan_name: null
    };
    setFormData(prev => ({
      ...prev,
      items: [...(prev.items || []), newItem]
    }));
    setProductSearchOpen(false);
    toast.success(`Added ${product.name} to bundle`);
  };

  const handleUpdateItem = (updatedItem) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === updatedItem.id ? updatedItem : item
      )
    }));
  };

  const handleRemoveItem = (itemId) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name?.trim()) {
      newErrors.name = 'Bundle name is required';
    }
    if (formData.items?.length === 0) {
      newErrors.items = 'Add at least one product to the bundle';
    }
    if (formData.pricing_strategy === 'fixed' && (!formData.fixed_price || formData.fixed_price <= 0)) {
      newErrors.fixed_price = 'Fixed price must be greater than 0';
    }
    if (formData.pricing_strategy === 'discount' && (formData.discount_percent < 0 || formData.discount_percent > 100)) {
      newErrors.discount_percent = 'Discount must be between 0 and 100';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      toast.error('Please fix the errors before saving');
      return;
    }
    onSave?.(formData);
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-cyan-400" />
            {isEditing ? 'Edit Bundle' : 'Create Bundle'}
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            {isEditing ? 'Update bundle details and products' : 'Create a new product bundle'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onCancel} className="text-zinc-400">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-cyan-500 hover:bg-cyan-600"
          >
            {saving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isEditing ? 'Update Bundle' : 'Create Bundle'}
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Basic Info & Products */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="p-6 rounded-xl bg-zinc-900/50 border border-white/5 space-y-4">
            <h3 className="font-medium text-white">Basic Information</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs text-zinc-500 mb-1 block">Bundle Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  placeholder="e.g., Starter Pack"
                  className={cn(
                    "bg-zinc-800 border-white/10",
                    errors.name && "border-red-500/50"
                  )}
                />
                {errors.name && (
                  <p className="text-xs text-red-400 mt-1">{errors.name}</p>
                )}
              </div>

              <div className="col-span-2">
                <label className="text-xs text-zinc-500 mb-1 block">Description</label>
                <Textarea
                  value={formData.description || ''}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  placeholder="Describe what's included in this bundle..."
                  className="bg-zinc-800 border-white/10 resize-none"
                  rows={2}
                />
              </div>

              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Bundle Type</label>
                <Select
                  value={formData.bundle_type}
                  onValueChange={(val) => handleFieldChange('bundle_type', val)}
                >
                  <SelectTrigger className="bg-zinc-800 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Bundle</SelectItem>
                    <SelectItem value="configurable">Configurable</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Status</label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => handleFieldChange('status', val)}
                >
                  <SelectTrigger className="bg-zinc-800 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Bundle Items */}
          <div className="p-6 rounded-xl bg-zinc-900/50 border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-white">Bundle Items</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setProductSearchOpen(true)}
                className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </div>

            {errors.items && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {errors.items}
              </div>
            )}

            {formData.items?.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-white/10 rounded-lg">
                <Package className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                <p className="text-sm text-zinc-500 mb-3">No products added yet</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setProductSearchOpen(true)}
                  className="border-white/10"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Product
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {formData.items.map(item => (
                  <BundleItemRow
                    key={item.id}
                    item={item}
                    currency={currency}
                    onUpdate={handleUpdateItem}
                    onRemove={handleRemoveItem}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Pricing */}
        <div className="space-y-6">
          {/* Pricing Strategy */}
          <Collapsible open={pricingOpen} onOpenChange={setPricingOpen}>
            <div className="p-6 rounded-xl bg-zinc-900/50 border border-white/5 space-y-4">
              <CollapsibleTrigger className="flex items-center justify-between w-full">
                <h3 className="font-medium text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-cyan-400" />
                  Pricing Strategy
                </h3>
                {pricingOpen ? (
                  <ChevronUp className="w-5 h-5 text-zinc-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-zinc-500" />
                )}
              </CollapsibleTrigger>

              <CollapsibleContent className="space-y-4">
                <div className="space-y-3">
                  {/* Sum of Items */}
                  <label
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                      formData.pricing_strategy === 'sum'
                        ? "bg-cyan-500/10 border-cyan-500/30"
                        : "bg-zinc-800/50 border-white/10 hover:border-white/20"
                    )}
                  >
                    <input
                      type="radio"
                      name="pricing_strategy"
                      checked={formData.pricing_strategy === 'sum'}
                      onChange={() => handleFieldChange('pricing_strategy', 'sum')}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-white text-sm">Sum of Items</div>
                      <div className="text-xs text-zinc-500">Price equals total of all products</div>
                    </div>
                  </label>

                  {/* Fixed Price */}
                  <label
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                      formData.pricing_strategy === 'fixed'
                        ? "bg-cyan-500/10 border-cyan-500/30"
                        : "bg-zinc-800/50 border-white/10 hover:border-white/20"
                    )}
                  >
                    <input
                      type="radio"
                      name="pricing_strategy"
                      checked={formData.pricing_strategy === 'fixed'}
                      onChange={() => handleFieldChange('pricing_strategy', 'fixed')}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-white text-sm">Fixed Price</div>
                      <div className="text-xs text-zinc-500">Set a specific bundle price</div>
                      {formData.pricing_strategy === 'fixed' && (
                        <div className="mt-2">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                              {currency === 'EUR' ? '€' : '$'}
                            </span>
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.fixed_price || ''}
                              onChange={(e) => handleFieldChange('fixed_price', parseFloat(e.target.value) || 0)}
                              className={cn(
                                "pl-7 bg-zinc-900 border-zinc-700",
                                errors.fixed_price && "border-red-500/50"
                              )}
                              placeholder="0.00"
                            />
                          </div>
                          {errors.fixed_price && (
                            <p className="text-xs text-red-400 mt-1">{errors.fixed_price}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </label>

                  {/* Discount */}
                  <label
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                      formData.pricing_strategy === 'discount'
                        ? "bg-cyan-500/10 border-cyan-500/30"
                        : "bg-zinc-800/50 border-white/10 hover:border-white/20"
                    )}
                  >
                    <input
                      type="radio"
                      name="pricing_strategy"
                      checked={formData.pricing_strategy === 'discount'}
                      onChange={() => handleFieldChange('pricing_strategy', 'discount')}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-white text-sm">Percentage Discount</div>
                      <div className="text-xs text-zinc-500">Apply discount to item total</div>
                      {formData.pricing_strategy === 'discount' && (
                        <div className="mt-2">
                          <div className="relative">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={formData.discount_percent || ''}
                              onChange={(e) => handleFieldChange('discount_percent', parseFloat(e.target.value) || 0)}
                              className={cn(
                                "pr-8 bg-zinc-900 border-zinc-700",
                                errors.discount_percent && "border-red-500/50"
                              )}
                              placeholder="0"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
                              %
                            </span>
                          </div>
                          {errors.discount_percent && (
                            <p className="text-xs text-red-400 mt-1">{errors.discount_percent}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Price Summary */}
          <div className="p-6 rounded-xl bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/20 space-y-4">
            <h3 className="font-medium text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-cyan-400" />
              Price Summary
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Items Total</span>
                <span className="text-white">{formatPrice(itemsTotal, currency)}</span>
              </div>

              {formData.pricing_strategy === 'discount' && formData.discount_percent > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Discount ({formData.discount_percent}%)</span>
                  <span className="text-cyan-400">-{formatPrice(savings, currency)}</span>
                </div>
              )}

              {formData.pricing_strategy === 'fixed' && savings !== 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Savings</span>
                  <span className={savings > 0 ? "text-cyan-400" : "text-red-400"}>
                    {savings > 0 ? '-' : '+'}{formatPrice(Math.abs(savings), currency)}
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">Final Price</span>
                  <span className="text-2xl font-bold text-cyan-400">
                    {formatPrice(finalPrice, currency)}
                  </span>
                </div>
                {savingsPercent > 0 && (
                  <div className="text-right mt-1">
                    <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                      Save {savingsPercent.toFixed(0)}%
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Search Modal */}
      <ProductSearchModal
        open={productSearchOpen}
        onClose={() => setProductSearchOpen(false)}
        onSelect={handleAddProduct}
        currency={currency}
        existingIds={formData.items?.map(i => i.product_id) || []}
      />
    </div>
  );
}
