import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, Package, Zap, CreditCard, Euro, Clock,
  ChevronRight, Check, X, Plus, RefreshCw, Gift, Layers,
  Filter, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Product, DigitalProduct, PhysicalProduct, ProductBundle } from '@/api/entities';
import { useUser } from '@/components/context/UserContext';

function formatPrice(amount, currency = 'EUR') {
  if (!amount && amount !== 0) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

/**
 * Convert a product + optional pricing selection into a line item
 */
function createLineItem(product, details, selection = {}) {
  const isDigital = product.type === 'digital';
  const basePrice = details?.pricing?.base_price || product.price || 0;

  // Default line item from product
  const lineItem = {
    product_id: product.id,
    product_type: product.type,
    name: product.name,
    description: product.short_description || '',
    sku: product.sku || '',
    quantity: 1,
    unit_price: basePrice,
    is_subscription: false,
    plan_id: null,
    plan_name: null,
    billing_cycle: null,
    add_ons: []
  };

  // If it's a digital product with subscription plan selected
  if (isDigital && selection.plan) {
    const plan = selection.plan;
    const cycle = selection.billing_cycle || 'monthly';
    const pricing = plan.pricing?.[cycle] || {};

    lineItem.is_subscription = true;
    lineItem.plan_id = plan.id;
    lineItem.plan_name = plan.name;
    lineItem.billing_cycle = cycle;
    lineItem.unit_price = pricing.amount || 0;
    lineItem.description = `${product.name} - ${plan.name} (${cycle})`;
  }

  // If one-time service selected
  if (isDigital && selection.oneTimeItem) {
    const item = selection.oneTimeItem;
    lineItem.is_subscription = false;
    lineItem.plan_id = null;
    lineItem.unit_price = item.amount || 0;
    lineItem.description = `${product.name} - ${item.name}`;
  }

  // Add-ons
  if (selection.addOns?.length > 0) {
    lineItem.add_ons = selection.addOns.map(addon => ({
      addon_id: addon.id,
      name: addon.name,
      unit_price: addon.pricing?.monthly?.amount || addon.pricing?.one_time?.amount || 0,
      is_subscription: addon.pricing_type === 'subscription'
    }));
  }

  return lineItem;
}

function ProductCard({ product, details, currency, onSelect, isSelected }) {
  const isDigital = product.type === 'digital';
  const basePrice = details?.pricing?.base_price || product.price || 0;
  const hasSubscription = details?.pricing_config?.subscriptions?.enabled;
  const hasOneTime = details?.pricing_config?.one_time?.enabled;
  const hasAddOns = details?.pricing_config?.add_ons?.enabled;
  const isDraft = product.status === 'draft';

  return (
    <div
      className={cn(
        "p-4 rounded-xl border transition-all cursor-pointer group",
        isSelected
          ? "bg-cyan-500/10 border-cyan-500/30"
          : "bg-zinc-900/50 border-white/10 hover:border-white/20"
      )}
      onClick={() => onSelect(product, details)}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
          isDigital
            ? "bg-cyan-500/10 border border-cyan-500/30"
            : "bg-amber-500/10 border border-amber-500/30"
        )}>
          {isDigital ? (
            <Zap className="w-5 h-5 text-cyan-400" />
          ) : (
            <Package className="w-5 h-5 text-amber-400" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-white truncate">{product.name}</h4>
            {isDraft && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-zinc-800 text-zinc-400 border-zinc-700">
                Draft
              </Badge>
            )}
            {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
          </div>
          {product.sku && (
            <p className="text-xs text-zinc-500">SKU: {product.sku}</p>
          )}
          {product.short_description && (
            <p className="text-sm text-zinc-400 line-clamp-1 mt-1">
              {product.short_description}
            </p>
          )}

          {/* Pricing badges for digital products */}
          {isDigital && (
            <div className="flex items-center gap-2 mt-2">
              {hasSubscription && (
                <Badge variant="outline" className="text-xs bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Subscription
                </Badge>
              )}
              {hasOneTime && (
                <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/30">
                  <Zap className="w-3 h-3 mr-1" />
                  One-time
                </Badge>
              )}
              {hasAddOns && (
                <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/30">
                  <Gift className="w-3 h-3 mr-1" />
                  Add-ons
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Price */}
        <div className="text-right flex-shrink-0">
          <div className="text-lg font-semibold text-white">
            {formatPrice(basePrice, currency)}
          </div>
          {!isDigital && (
            <p className="text-xs text-zinc-500">Base price</p>
          )}
        </div>
      </div>
    </div>
  );
}

function DigitalPricingSelector({ product, details, currency, onConfirm, onCancel }) {
  const [selectedType, setSelectedType] = useState('subscription');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedCycle, setSelectedCycle] = useState('monthly');
  const [selectedOneTime, setSelectedOneTime] = useState(null);
  const [selectedAddOns, setSelectedAddOns] = useState([]);

  const pricingConfig = details?.pricing_config || {};
  const hasSubscription = pricingConfig.subscriptions?.enabled && pricingConfig.subscriptions?.plans?.length > 0;
  const hasOneTime = pricingConfig.one_time?.enabled && pricingConfig.one_time?.items?.length > 0;
  const hasAddOns = pricingConfig.add_ons?.enabled && pricingConfig.add_ons?.items?.length > 0;

  const subscriptionPlans = pricingConfig.subscriptions?.plans || [];
  const oneTimeItems = pricingConfig.one_time?.items || [];
  const addOnItems = pricingConfig.add_ons?.items || [];

  // Default to subscription if available, otherwise one-time
  useEffect(() => {
    if (hasSubscription) {
      setSelectedType('subscription');
      if (subscriptionPlans.length > 0) {
        setSelectedPlan(subscriptionPlans[0]);
      }
    } else if (hasOneTime) {
      setSelectedType('one_time');
      if (oneTimeItems.length > 0) {
        setSelectedOneTime(oneTimeItems[0]);
      }
    }
  }, [hasSubscription, hasOneTime]);

  const toggleAddOn = (addon) => {
    setSelectedAddOns(prev =>
      prev.find(a => a.id === addon.id)
        ? prev.filter(a => a.id !== addon.id)
        : [...prev, addon]
    );
  };

  const handleConfirm = () => {
    const selection = {
      type: selectedType,
      plan: selectedType === 'subscription' ? selectedPlan : null,
      billing_cycle: selectedCycle,
      oneTimeItem: selectedType === 'one_time' ? selectedOneTime : null,
      addOns: selectedAddOns
    };

    const lineItem = createLineItem(product, details, selection);
    onConfirm(lineItem);
  };

  // Calculate preview price
  let previewPrice = 0;
  if (selectedType === 'subscription' && selectedPlan) {
    previewPrice = selectedPlan.pricing?.[selectedCycle]?.amount || 0;
  } else if (selectedType === 'one_time' && selectedOneTime) {
    previewPrice = selectedOneTime.amount || 0;
  }

  // Add add-ons to preview
  const addOnsTotal = selectedAddOns.reduce((sum, addon) => {
    const price = addon.pricing_type === 'subscription'
      ? (addon.pricing?.monthly?.amount || 0)
      : (addon.pricing?.one_time?.amount || 0);
    return sum + price;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Product Info Header */}
      <div className="flex items-center gap-3 p-4 rounded-lg bg-zinc-900/50 border border-white/5">
        <div className="w-12 h-12 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
          <Zap className="w-6 h-6 text-cyan-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-white">{product.name}</h3>
          {product.short_description && (
            <p className="text-sm text-zinc-500">{product.short_description}</p>
          )}
        </div>
      </div>

      {/* Pricing Type Tabs */}
      {(hasSubscription || hasOneTime) && (
        <Tabs value={selectedType} onValueChange={setSelectedType}>
          <TabsList className="bg-zinc-900/50 border border-white/5">
            {hasSubscription && (
              <TabsTrigger value="subscription" className="data-[state=active]:bg-cyan-500/20">
                <RefreshCw className="w-4 h-4 mr-2" />
                Subscription
              </TabsTrigger>
            )}
            {hasOneTime && (
              <TabsTrigger value="one_time" className="data-[state=active]:bg-amber-500/20">
                <Zap className="w-4 h-4 mr-2" />
                One-time
              </TabsTrigger>
            )}
          </TabsList>

          {/* Subscription Plans */}
          {hasSubscription && (
            <TabsContent value="subscription" className="space-y-4 mt-4">
              {/* Plan Selection */}
              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Select Plan</label>
                <div className="space-y-2">
                  {subscriptionPlans.map(plan => (
                    <div
                      key={plan.id}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-all",
                        selectedPlan?.id === plan.id
                          ? "bg-cyan-500/10 border-cyan-500/30"
                          : "bg-zinc-900/50 border-white/10 hover:border-white/20"
                      )}
                      onClick={() => setSelectedPlan(plan)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {selectedPlan?.id === plan.id && (
                            <Check className="w-4 h-4 text-cyan-400" />
                          )}
                          <span className="font-medium text-white">{plan.name}</span>
                          {plan.is_popular && (
                            <Badge className="bg-cyan-500/20 text-cyan-400 text-xs">
                              <Star className="w-3 h-3 mr-1" /> Popular
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-semibold text-white">
                            {formatPrice(plan.pricing?.[selectedCycle]?.amount || 0, currency)}
                          </span>
                          <span className="text-sm text-zinc-500">/{selectedCycle === 'yearly' ? 'year' : 'mo'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Billing Cycle */}
              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Billing Cycle</label>
                <Select value={selectedCycle} onValueChange={setSelectedCycle}>
                  <SelectTrigger className="bg-zinc-900/50 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          )}

          {/* One-time Items */}
          {hasOneTime && (
            <TabsContent value="one_time" className="space-y-4 mt-4">
              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Select Service</label>
                <div className="space-y-2">
                  {oneTimeItems.map(item => (
                    <div
                      key={item.id}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-all",
                        selectedOneTime?.id === item.id
                          ? "bg-amber-500/10 border-amber-500/30"
                          : "bg-zinc-900/50 border-white/10 hover:border-white/20"
                      )}
                      onClick={() => setSelectedOneTime(item)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {selectedOneTime?.id === item.id && (
                            <Check className="w-4 h-4 text-amber-400" />
                          )}
                          <span className="font-medium text-white">{item.name}</span>
                        </div>
                        <span className="text-lg font-semibold text-white">
                          {formatPrice(item.amount, currency)}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-sm text-zinc-500 mt-1">{item.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      )}

      {/* Add-ons */}
      {hasAddOns && (
        <div>
          <label className="text-sm text-zinc-400 mb-2 block flex items-center gap-2">
            <Gift className="w-4 h-4" />
            Optional Add-ons
          </label>
          <div className="space-y-2">
            {addOnItems.map(addon => {
              const isSelected = selectedAddOns.find(a => a.id === addon.id);
              const price = addon.pricing_type === 'subscription'
                ? (addon.pricing?.monthly?.amount || 0)
                : (addon.pricing?.one_time?.amount || 0);

              return (
                <div
                  key={addon.id}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all",
                    isSelected
                      ? "bg-purple-500/10 border-purple-500/30"
                      : "bg-zinc-900/50 border-white/10 hover:border-white/20"
                  )}
                  onClick={() => toggleAddOn(addon)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-5 h-5 rounded border flex items-center justify-center",
                        isSelected
                          ? "bg-purple-500 border-purple-500"
                          : "border-white/20"
                      )}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="font-medium text-white">{addon.name}</span>
                      {addon.pricing_type === 'subscription' && (
                        <Badge variant="outline" className="text-xs text-purple-400 border-purple-500/30">
                          <RefreshCw className="w-3 h-3 mr-1" /> Recurring
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-white">
                        +{formatPrice(price, currency)}
                      </span>
                      {addon.pricing_type === 'subscription' && (
                        <span className="text-xs text-zinc-500">/mo</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Price Summary */}
      <div className="p-4 rounded-lg bg-gradient-to-r from-cyan-500/10 to-cyan-600/5 border border-cyan-500/20">
        <div className="flex items-center justify-between">
          <span className="text-zinc-400">Line Item Total</span>
          <div className="text-right">
            <span className="text-2xl font-bold text-cyan-400">
              {formatPrice(previewPrice + addOnsTotal, currency)}
            </span>
            {selectedType === 'subscription' && (
              <span className="text-sm text-zinc-500 ml-1">
                /{selectedCycle === 'yearly' ? 'year' : 'mo'}
              </span>
            )}
          </div>
        </div>
        {addOnsTotal > 0 && (
          <p className="text-xs text-zinc-500 mt-1">
            Includes {selectedAddOns.length} add-on{selectedAddOns.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          onClick={handleConfirm}
          className="flex-1 bg-cyan-500 hover:bg-cyan-600"
          disabled={
            (selectedType === 'subscription' && !selectedPlan) ||
            (selectedType === 'one_time' && !selectedOneTime)
          }
        >
          <Plus className="w-4 h-4 mr-2" />
          Add to Invoice
        </Button>
        <Button variant="ghost" onClick={onCancel} className="text-zinc-400">
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default function ProductSelector({
  open,
  onClose,
  onSelect,
  currency = 'EUR',
  excludeIds = []
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [productDetails, setProductDetails] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const { user } = useUser();

  const loadProducts = async () => {
    if (!user?.company_id) return;

    setLoading(true);
    try {
      // Load all products (draft, published, or active - all usable in proposals)
      const allProducts = await Product.filter({
        company_id: user.company_id
      });

      // Filter out excluded products and archived ones
      const filtered = allProducts.filter(p =>
        !excludeIds.includes(p.id) && p.status !== 'archived'
      );
      setProducts(filtered);

      // Load details for digital products
      const digitalProducts = filtered.filter(p => p.type === 'digital');
      const detailsMap = {};

      for (const product of digitalProducts) {
        try {
          const details = await DigitalProduct.filter({ product_id: product.id }, { limit: 1 });
          if (details && details[0]) {
            detailsMap[product.id] = details[0];
          }
        } catch (err) {
          console.warn(`Could not load details for product ${product.id}:`, err);
        }
      }

      // Load details for physical products
      const physicalProducts = filtered.filter(p => p.type === 'physical');
      for (const product of physicalProducts) {
        try {
          const details = await PhysicalProduct.filter({ product_id: product.id }, { limit: 1 });
          if (details && details[0]) {
            detailsMap[product.id] = details[0];
          }
        } catch (err) {
          console.warn(`Could not load details for product ${product.id}:`, err);
        }
      }

      setProductDetails(detailsMap);
    } catch (err) {
      console.error('Failed to load products:', err);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadProducts();
      setSelectedProduct(null);
      setSelectedDetails(null);
      setSearchQuery('');
    }
  }, [open, user?.company_id]);

  // Filter products based on search and tab
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // Search filter
      const matchesSearch = !searchQuery ||
        product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchQuery.toLowerCase());

      // Tab filter
      const matchesTab = activeTab === 'all' ||
        (activeTab === 'digital' && product.type === 'digital') ||
        (activeTab === 'physical' && product.type === 'physical');

      return matchesSearch && matchesTab;
    });
  }, [products, searchQuery, activeTab]);

  const handleProductSelect = (product, details) => {
    // If digital product with pricing options, show selector
    if (product.type === 'digital' && details?.pricing_config) {
      const config = details.pricing_config;
      const hasOptions = config.subscriptions?.enabled || config.one_time?.enabled;
      if (hasOptions) {
        setSelectedProduct(product);
        setSelectedDetails(details);
        return;
      }
    }

    // Otherwise, add as simple line item
    const lineItem = createLineItem(product, details, {});
    onSelect(lineItem);
    onClose();
  };

  const handleDigitalConfirm = (lineItem) => {
    onSelect(lineItem);
    onClose();
  };

  // If a digital product is selected for pricing options
  if (selectedProduct) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-lg bg-zinc-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-cyan-400" />
              Select Pricing Options
            </DialogTitle>
          </DialogHeader>
          <DigitalPricingSelector
            product={selectedProduct}
            details={selectedDetails}
            currency={currency}
            onConfirm={handleDigitalConfirm}
            onCancel={() => {
              setSelectedProduct(null);
              setSelectedDetails(null);
            }}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-zinc-900 border-white/10 max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-cyan-400" />
            Add Product to Invoice
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Search & Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products by name or SKU..."
                className="pl-9 bg-zinc-800 border-white/10"
              />
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-zinc-800 border border-white/5">
                <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                <TabsTrigger value="digital" className="text-xs">Digital</TabsTrigger>
                <TabsTrigger value="physical" className="text-xs">Physical</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Product List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 rounded-xl bg-zinc-800/50 animate-pulse" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-400">
                  {products.length === 0 ? 'No published products' : 'No products match your search'}
                </p>
              </div>
            ) : (
              filteredProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  details={productDetails[product.id]}
                  currency={currency}
                  onSelect={handleProductSelect}
                  isSelected={false}
                />
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Export helper for creating line items programmatically
export { createLineItem };
