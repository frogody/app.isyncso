import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Package, Cloud, Box, Briefcase, Plus, ArrowRight,
  Search, Tag,
  Eye, Edit2,
  Settings, Loader2
} from "lucide-react";
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { ProductsPageTransition } from '@/components/products/ui';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/components/context/UserContext";
import { Product, ProductCategory } from "@/api/entities";
import { db } from "@/api/supabaseClient";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const STATUS_COLORS = {
  published: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  draft: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30' },
  archived: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30' },
};

const TYPE_ICONS = {
  digital: Cloud,
  physical: Box,
  service: Briefcase,
};

function ProductCard({ product }) {
  const { t } = useTheme();
  const Icon = TYPE_ICONS[product.type] || Package;
  const status = STATUS_COLORS[product.status] || STATUS_COLORS.draft;

  return (
    <Link to={createPageUrl(`ProductDetail?type=${product.type}&slug=${product.slug}`)}>
      <div className={cn("group p-4 rounded-xl border transition-all cursor-pointer", t('bg-white shadow-sm', 'bg-zinc-900/50'), t('border-slate-200', 'border-zinc-800/60'), "hover:border-cyan-500/30")}>
        <div className="flex items-start gap-4">
          {/* Product Image or Icon */}
          <div className="w-16 h-16 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {product.featured_image?.url ? (
              <img
                src={product.featured_image.url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Icon className="w-7 h-7 text-cyan-400" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className={cn("font-medium truncate group-hover:text-cyan-400 transition-colors", t('text-slate-900', 'text-white'))}>
                  {product.name}
                </h3>
                <p className={cn("text-sm mt-0.5 line-clamp-1", t('text-slate-400', 'text-zinc-500'))}>
                  {product.tagline || product.short_description || 'No description'}
                </p>
              </div>
              <Badge className={`${status.bg} ${status.text} ${status.border} text-xs`}>
                {product.status}
              </Badge>
            </div>

            <div className="flex items-center gap-3 mt-3">
              <span className={`inline-flex items-center gap-1 text-xs ${product.type === 'digital' ? 'text-cyan-400' : 'text-cyan-400'}`}>
                <Icon className="w-3 h-3" />
                {product.type}
              </span>
              {product.category && (
                <span className={cn("text-xs", t('text-slate-400', 'text-zinc-500'))}>
                  {product.category}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}


// Settings key for localStorage (synced with UserAppConfig when available)
const PRODUCTS_SETTINGS_KEY = 'isyncso_products_settings';

export default function Products() {
  const { user, companyId } = useUser();
  const { theme, toggleTheme, t } = useTheme();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Product type settings
  const [digitalEnabled, setDigitalEnabled] = useState(true);
  const [physicalEnabled, setPhysicalEnabled] = useState(true);
  const [serviceEnabled, setServiceEnabled] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Create product modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [newProductData, setNewProductData] = useState({
    name: '',
    type: 'digital',
    status: 'draft'
  });

  // SEO: Set page title
  useEffect(() => {
    document.title = 'Products | iSyncSO';
    return () => { document.title = 'iSyncSO'; };
  }, []);

  // Load settings from localStorage and UserAppConfig
  useEffect(() => {
    const loadSettings = async () => {
      // First try localStorage for immediate UI
      const localSettings = localStorage.getItem(PRODUCTS_SETTINGS_KEY);
      if (localSettings) {
        try {
          const parsed = JSON.parse(localSettings);
          setDigitalEnabled(parsed.digitalEnabled ?? true);
          setPhysicalEnabled(parsed.physicalEnabled ?? true);
          setServiceEnabled(parsed.serviceEnabled ?? true);
        } catch (e) {
          console.error('Failed to parse local settings:', e);
        }
      }

      // Then try to load from UserAppConfig
      if (user?.id) {
        try {
          const configs = await db.entities.UserAppConfig.filter({ user_id: user.id });
          if (configs.length > 0 && configs[0].products_settings) {
            const settings = configs[0].products_settings;
            setDigitalEnabled(settings.digitalEnabled ?? true);
            setPhysicalEnabled(settings.physicalEnabled ?? true);
            setServiceEnabled(settings.serviceEnabled ?? true);
            // Sync to localStorage
            localStorage.setItem(PRODUCTS_SETTINGS_KEY, JSON.stringify(settings));
          }
        } catch (e) {
          console.error('Failed to load user app config:', e);
        }
      }
    };

    loadSettings();
  }, [user?.id]);

  // Save settings
  const saveSettings = async (digital, physical, service) => {
    const settings = { digitalEnabled: digital, physicalEnabled: physical, serviceEnabled: service };

    // Save to localStorage immediately
    localStorage.setItem(PRODUCTS_SETTINGS_KEY, JSON.stringify(settings));

    // Dispatch event so sidebar can update
    window.dispatchEvent(new CustomEvent('products-settings-changed', { detail: settings }));

    // Save to UserAppConfig
    if (user?.id) {
      setSettingsSaving(true);
      try {
        const configs = await db.entities.UserAppConfig.filter({ user_id: user.id });
        if (configs.length > 0) {
          await db.entities.UserAppConfig.update(configs[0].id, {
            products_settings: settings
          });
        } else {
          await db.entities.UserAppConfig.create({
            user_id: user.id,
            products_settings: settings
          });
        }
        toast.success('Settings saved');
      } catch (e) {
        console.error('Failed to save settings:', e);
        toast.error('Failed to save settings');
      } finally {
        setSettingsSaving(false);
      }
    }
  };

  const handleDigitalToggle = (checked) => {
    if (!checked && !physicalEnabled && !serviceEnabled) {
      toast.error('At least one product type must be enabled');
      return;
    }
    setDigitalEnabled(checked);
    saveSettings(checked, physicalEnabled, serviceEnabled);
  };

  const handlePhysicalToggle = (checked) => {
    if (!checked && !digitalEnabled && !serviceEnabled) {
      toast.error('At least one product type must be enabled');
      return;
    }
    setPhysicalEnabled(checked);
    saveSettings(digitalEnabled, checked, serviceEnabled);
  };

  const handleServiceToggle = (checked) => {
    if (!checked && !digitalEnabled && !physicalEnabled) {
      toast.error('At least one product type must be enabled');
      return;
    }
    setServiceEnabled(checked);
    saveSettings(digitalEnabled, physicalEnabled, checked);
  };

  // Create a new product
  const handleCreateProduct = async () => {
    if (!newProductData.name.trim()) {
      toast.error('Please enter a product name');
      return;
    }

    setCreatingProduct(true);
    try {
      // Generate a slug from the name
      const slug = newProductData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        + '-' + Date.now().toString(36);

      const productData = {
        name: newProductData.name.trim(),
        slug,
        type: newProductData.type,
        status: newProductData.status,
        company_id: companyId || user?.company_id,
      };

      const created = await Product.create(productData);
      toast.success('Product created! Redirecting to edit...');
      setShowCreateModal(false);
      setNewProductData({ name: '', type: 'digital', status: 'draft' });

      // Navigate to the product detail page
      navigate(createPageUrl('ProductDetail') + `?type=${created.type}&slug=${created.slug}`);
    } catch (error) {
      console.error('Failed to create product:', error);
      toast.error('Failed to create product: ' + (error.message || 'Unknown error'));
    } finally {
      setCreatingProduct(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!user?.id) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const [productsData, categoriesData] = await Promise.all([
          Product.list({ limit: 5000 }).catch(() => []),
          ProductCategory.list({ limit: 5000 }).catch(() => []),
        ]);

        if (!isMounted) return;
        setProducts(productsData || []);
        setCategories(categoriesData || []);
      } catch (error) {
        console.error('Failed to load products:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [user]);

  const stats = useMemo(() => {
    const digital = products.filter(p => p.type === 'digital');
    const physical = products.filter(p => p.type === 'physical');
    const service = products.filter(p => p.type === 'service');
    const published = products.filter(p => p.status === 'published');
    const draft = products.filter(p => p.status === 'draft');

    return {
      total: products.length,
      digital: digital.length,
      physical: physical.length,
      service: service.length,
      published: published.length,
      draft: draft.length,
      categories: categories.length,
    };
  }, [products, categories]);

  const recentProducts = useMemo(() => {
    return [...products]
      .filter(p => {
        if (p.type === 'digital' && !digitalEnabled) return false;
        if (p.type === 'physical' && !physicalEnabled) return false;
        if (p.type === 'service' && !serviceEnabled) return false;
        return true;
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 6);
  }, [products, digitalEnabled, physicalEnabled, serviceEnabled]);

  const filteredProducts = useMemo(() => {
    let filtered = products.filter(p => {
      if (p.type === 'digital' && !digitalEnabled) return false;
      if (p.type === 'physical' && !physicalEnabled) return false;
      if (p.type === 'service' && !serviceEnabled) return false;
      return true;
    });

    if (!searchQuery.trim()) return filtered.slice(0, 6);

    const q = searchQuery.toLowerCase();
    return filtered.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.tagline?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [products, digitalEnabled, physicalEnabled, serviceEnabled, searchQuery]);


  return (
    <ProductsPageTransition className={cn("min-h-screen", t('bg-slate-50', 'bg-black'))}>
      <div className="max-w-full mx-auto px-4 lg:px-6 py-4 space-y-4">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className={cn("text-lg font-bold", t('text-slate-900', 'text-white'))}>Products</h1>
            <p className={cn("text-xs", t('text-slate-500', 'text-zinc-400'))}>{stats.total} total products</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Theme Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              className={cn("border", t('border-slate-200 bg-white text-slate-600 hover:bg-slate-100', 'border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700'))}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>

            {/* Settings Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn("border", t('border-slate-200 bg-white text-slate-600 hover:bg-slate-100', 'border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700'))}
                >
                  <Settings className="w-4 h-4 mr-1" /> Settings
                </Button>
              </PopoverTrigger>
              <PopoverContent className={cn("w-72 border p-4", t('bg-white border-slate-200', 'bg-zinc-900 border-zinc-800'))} align="end">
                <div className="space-y-4">
                  <div>
                    <h4 className={cn("font-medium mb-1", t('text-slate-900', 'text-white'))}>Product Types</h4>
                    <p className={cn("text-xs", t('text-slate-400', 'text-zinc-500'))}>Enable or disable product categories</p>
                  </div>

                  <div className={cn("flex items-center justify-between p-3 rounded-lg border", t('bg-slate-100 border-slate-200', 'bg-zinc-800/50 border-zinc-700/50'))}>
                    <div className="flex items-center gap-3">
                      <Cloud className="w-4 h-4 text-cyan-400" />
                      <div>
                        <div className={cn("text-sm font-medium", t('text-slate-900', 'text-white'))}>Digital</div>
                        <div className={cn("text-xs", t('text-slate-400', 'text-zinc-500'))}>SaaS, software, courses</div>
                      </div>
                    </div>
                    <Switch checked={digitalEnabled} onCheckedChange={handleDigitalToggle} disabled={settingsSaving} />
                  </div>

                  <div className={cn("flex items-center justify-between p-3 rounded-lg border", t('bg-slate-100 border-slate-200', 'bg-zinc-800/50 border-zinc-700/50'))}>
                    <div className="flex items-center gap-3">
                      <Box className="w-4 h-4 text-cyan-400" />
                      <div>
                        <div className={cn("text-sm font-medium", t('text-slate-900', 'text-white'))}>Physical</div>
                        <div className={cn("text-xs", t('text-slate-400', 'text-zinc-500'))}>Hardware, goods, inventory</div>
                      </div>
                    </div>
                    <Switch checked={physicalEnabled} onCheckedChange={handlePhysicalToggle} disabled={settingsSaving} />
                  </div>

                  <div className={cn("flex items-center justify-between p-3 rounded-lg border", t('bg-slate-100 border-slate-200', 'bg-zinc-800/50 border-zinc-700/50'))}>
                    <div className="flex items-center gap-3">
                      <Briefcase className="w-4 h-4 text-cyan-400" />
                      <div>
                        <div className={cn("text-sm font-medium", t('text-slate-900', 'text-white'))}>Services</div>
                        <div className={cn("text-xs", t('text-slate-400', 'text-zinc-500'))}>Consulting, design, advisory</div>
                      </div>
                    </div>
                    <Switch checked={serviceEnabled} onCheckedChange={handleServiceToggle} disabled={settingsSaving} />
                  </div>

                  {settingsSaving && (
                    <div className={cn("text-xs text-center", t('text-slate-400', 'text-zinc-500'))}>Saving...</div>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-cyan-600/80 hover:bg-cyan-600 text-white"
            >
              <Plus className="w-4 h-4 mr-1" /> Add Product
            </Button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className={`grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-${3 + (digitalEnabled ? 1 : 0) + (physicalEnabled ? 1 : 0) + (serviceEnabled ? 1 : 0)}`}>
          {[
            { icon: Package, label: 'Total Products', value: loading ? '-' : stats.total },
            ...(digitalEnabled ? [{ icon: Cloud, label: 'Digital', value: loading ? '-' : stats.digital }] : []),
            ...(physicalEnabled ? [{ icon: Box, label: 'Physical', value: loading ? '-' : stats.physical }] : []),
            ...(serviceEnabled ? [{ icon: Briefcase, label: 'Services', value: loading ? '-' : stats.service }] : []),
            { icon: Eye, label: 'Published', value: loading ? '-' : stats.published },
            { icon: Edit2, label: 'Drafts', value: loading ? '-' : stats.draft },
            { icon: Tag, label: 'Categories', value: loading ? '-' : stats.categories },
          ].map((stat) => {
            const StatIcon = stat.icon;
            return (
              <div key={stat.label} className={cn("border rounded-xl p-3", t('bg-white shadow-sm', 'bg-zinc-900/50'), t('border-slate-200', 'border-zinc-800/60'))}>
                <div className="flex items-center justify-between mb-2">
                  <StatIcon className="w-4 h-4 text-cyan-400/70" />
                </div>
                <div className={cn("text-lg font-bold", t('text-slate-900', 'text-white'))}>{stat.value}</div>
                <div className={cn("text-[10px]", t('text-slate-400', 'text-zinc-500'))}>{stat.label}</div>
              </div>
            );
          })}
        </div>

        {/* Quick Navigation Cards */}
        <div className={`grid gap-4 grid-cols-1 ${[digitalEnabled, physicalEnabled, serviceEnabled].filter(Boolean).length >= 2 ? 'md:grid-cols-2' : ''} ${[digitalEnabled, physicalEnabled, serviceEnabled].filter(Boolean).length >= 3 ? 'lg:grid-cols-3' : ''}`}>
          {digitalEnabled && (
            <Link to={createPageUrl('ProductsDigital')}>
              <div className={cn("group p-4 border rounded-xl hover:border-cyan-500/30 transition-all cursor-pointer", t('bg-white shadow-sm', 'bg-zinc-900/50'), t('border-slate-200', 'border-zinc-800/60'))}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                    <Cloud className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className={cn("text-base font-semibold group-hover:text-cyan-400 transition-colors", t('text-slate-900', 'text-white'))}>
                      Digital Products
                    </h3>
                    <p className={cn("text-xs mt-1", t('text-slate-500', 'text-zinc-400'))}>
                      Software, SaaS, courses, subscriptions, and downloadable content
                    </p>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="text-lg font-bold text-cyan-400">{stats.digital}</span>
                      <span className={cn("text-xs", t('text-slate-400', 'text-zinc-500'))}>products</span>
                      <ArrowRight className={cn("w-4 h-4 ml-auto group-hover:text-cyan-400 transition-colors", t('text-slate-400', 'text-zinc-500'))} />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {physicalEnabled && (
            <Link to={createPageUrl('ProductsPhysical')}>
              <div className={cn("group p-4 border rounded-xl hover:border-cyan-500/30 transition-all cursor-pointer", t('bg-white shadow-sm', 'bg-zinc-900/50'), t('border-slate-200', 'border-zinc-800/60'))}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                    <Box className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className={cn("text-base font-semibold group-hover:text-cyan-400 transition-colors", t('text-slate-900', 'text-white'))}>
                      Physical Products
                    </h3>
                    <p className={cn("text-xs mt-1", t('text-slate-500', 'text-zinc-400'))}>
                      Hardware, merchandise, equipment, and tangible goods
                    </p>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="text-lg font-bold text-cyan-400">{stats.physical}</span>
                      <span className={cn("text-xs", t('text-slate-400', 'text-zinc-500'))}>products</span>
                      <ArrowRight className={cn("w-4 h-4 ml-auto group-hover:text-cyan-400 transition-colors", t('text-slate-400', 'text-zinc-500'))} />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {serviceEnabled && (
            <Link to={createPageUrl('ProductsServices')}>
              <div className={cn("group p-4 border rounded-xl hover:border-cyan-500/30 transition-all cursor-pointer", t('bg-white shadow-sm', 'bg-zinc-900/50'), t('border-slate-200', 'border-zinc-800/60'))}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className={cn("text-base font-semibold group-hover:text-cyan-400 transition-colors", t('text-slate-900', 'text-white'))}>
                      Services
                    </h3>
                    <p className={cn("text-xs mt-1", t('text-slate-500', 'text-zinc-400'))}>
                      Consulting, headhunting, design, and advisory services
                    </p>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="text-lg font-bold text-cyan-400">{stats.service}</span>
                      <span className={cn("text-xs", t('text-slate-400', 'text-zinc-500'))}>services</span>
                      <ArrowRight className={cn("w-4 h-4 ml-auto group-hover:text-cyan-400 transition-colors", t('text-slate-400', 'text-zinc-500'))} />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", t('text-slate-400', 'text-zinc-500'))} />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn("pl-9", t('bg-white border-slate-200 text-slate-900 placeholder:text-slate-400', 'bg-zinc-900/50 border-zinc-800/60 text-white placeholder:text-zinc-500'))}
          />
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className={cn("h-20", t('bg-slate-200', 'bg-zinc-800/50'))} />
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4", t('bg-slate-100', 'bg-zinc-800/50'))}>
              <Package className="w-7 h-7 text-zinc-600" />
            </div>
            <p className={cn("font-medium", t('text-slate-900', 'text-white'))}>No products yet</p>
            <p className={cn("text-sm mt-1 max-w-xs mx-auto", t('text-slate-400', 'text-zinc-500'))}>
              {searchQuery ? 'No products match your search' : 'Get started by adding your first product'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowCreateModal(true)} className="mt-4 bg-cyan-600/80 hover:bg-cyan-600 text-white">
                <Plus className="w-4 h-4 mr-1" /> Add Your First Product
              </Button>
            )}
          </div>
        )}

        {filteredProducts.length > 0 && (
          <div className="flex justify-center">
            <Link to={createPageUrl(digitalEnabled ? 'ProductsDigital' : 'ProductsPhysical')}>
              <Button variant="outline" className={cn("border", t('border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100', 'border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800'))}>
                View All Products <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        )}

        {/* Categories */}
        {categories.length > 0 && (
          <div className={cn("border rounded-xl p-4", t('bg-white shadow-sm', 'bg-zinc-900/50'), t('border-slate-200', 'border-zinc-800/60'))}>
            <h3 className={cn("text-sm font-semibold mb-3", t('text-slate-900', 'text-white'))}>Categories</h3>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Badge
                  key={category.id}
                  className={cn("border hover:border-cyan-500/30 hover:text-cyan-400 cursor-pointer transition-colors", t('bg-slate-100 border-slate-200 text-slate-600', 'bg-zinc-800/50 border-zinc-700/50 text-zinc-300'))}
                >
                  {category.name}
                  <span className={cn("ml-2 text-[10px]", t('text-slate-400', 'text-zinc-500'))}>
                    {products.filter(p => p.category_id === category.id).length}
                  </span>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Product Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className={cn("border max-w-md", t('bg-white border-slate-200 text-slate-900', 'bg-zinc-900 border-zinc-800 text-white'))}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Create New Product</DialogTitle>
            <DialogDescription className={t('text-slate-500', 'text-zinc-400')}>
              Enter basic details to create a product. You can add more details after.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="product-name" className={t('text-slate-600', 'text-zinc-300')}>Product Name</Label>
              <Input
                id="product-name"
                placeholder="Enter product name..."
                value={newProductData.name}
                onChange={(e) => setNewProductData(prev => ({ ...prev, name: e.target.value }))}
                className={cn(t('bg-slate-100 border-slate-200 text-slate-900 placeholder:text-slate-400', 'bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500'))}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label className={t('text-slate-600', 'text-zinc-300')}>Product Type</Label>
              <Select
                value={newProductData.type}
                onValueChange={(value) => setNewProductData(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger className={cn(t('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800/50 border-zinc-700 text-white'))}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={cn(t('bg-white border-slate-200', 'bg-zinc-800 border-zinc-700'))}>
                  <SelectItem value="digital" className={cn(t('text-slate-900 hover:bg-slate-100', 'text-white hover:bg-zinc-700'))}>
                    <div className="flex items-center gap-2">
                      <Cloud className="w-4 h-4 text-cyan-400" />
                      Digital Product
                    </div>
                  </SelectItem>
                  <SelectItem value="physical" className={cn(t('text-slate-900 hover:bg-slate-100', 'text-white hover:bg-zinc-700'))}>
                    <div className="flex items-center gap-2">
                      <Box className="w-4 h-4 text-cyan-400" />
                      Physical Product
                    </div>
                  </SelectItem>
                  <SelectItem value="service" className={cn(t('text-slate-900 hover:bg-slate-100', 'text-white hover:bg-zinc-700'))}>
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-cyan-400" />
                      Service
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className={t('text-slate-600', 'text-zinc-300')}>Initial Status</Label>
              <Select
                value={newProductData.status}
                onValueChange={(value) => setNewProductData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger className={cn(t('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800/50 border-zinc-700 text-white'))}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={cn(t('bg-white border-slate-200', 'bg-zinc-800 border-zinc-700'))}>
                  <SelectItem value="draft" className={cn(t('text-slate-900 hover:bg-slate-100', 'text-white hover:bg-zinc-700'))}>Draft</SelectItem>
                  <SelectItem value="published" className={cn(t('text-slate-900 hover:bg-slate-100', 'text-white hover:bg-zinc-700'))}>Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              className={cn("border", t('border-slate-200 text-slate-600 hover:text-slate-900', 'border-zinc-700 text-zinc-300 hover:text-white'))}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProduct}
              disabled={creatingProduct || !newProductData.name.trim()}
              className="bg-cyan-500 hover:bg-cyan-600 text-white"
            >
              {creatingProduct ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Product
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProductsPageTransition>
  );
}
