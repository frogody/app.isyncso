import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import anime from '@/lib/anime-wrapper';
const animate = anime;
import { prefersReducedMotion } from '@/lib/animations';
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Package, Cloud, Box, Plus, ArrowRight, TrendingUp,
  Search, Filter, Grid3X3, List, Tag, DollarSign,
  Eye, Edit2, MoreHorizontal, Archive, Layers, Sparkles,
  Settings, Check, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { GlassCard, StatCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/components/context/UserContext";
import { Product, ProductCategory } from "@/api/entities";
import { db } from "@/api/supabaseClient";
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
  published: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
  draft: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  archived: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30' },
};

const TYPE_ICONS = {
  digital: Cloud,
  physical: Box,
};

function ProductCard({ product }) {
  const Icon = TYPE_ICONS[product.type] || Package;
  const status = STATUS_COLORS[product.status] || STATUS_COLORS.draft;

  return (
    <Link to={createPageUrl(`ProductDetail?type=${product.type}&slug=${product.slug}`)}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="group p-4 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-cyan-500/30 transition-all cursor-pointer"
      >
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
                <h3 className="font-medium text-white truncate group-hover:text-cyan-400 transition-colors">
                  {product.name}
                </h3>
                <p className="text-sm text-zinc-500 mt-0.5 line-clamp-1">
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
                <span className="text-xs text-zinc-500">
                  {product.category}
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

function QuickStatCard({ icon: Icon, label, value, sublabel, color = 'purple' }) {
  const colorClasses = {
    purple: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
    cyan: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
    green: 'bg-green-500/10 border-green-500/30 text-green-400',
  };

  // Parse numeric value for count-up animation
  const numValue = typeof value === 'string' && value !== '-' ? parseInt(value) || 0 : (typeof value === 'number' ? value : 0);

  return (
    <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} border flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          {value === '-' ? (
            <div className="text-2xl font-bold text-white">-</div>
          ) : (
            <div className="stat-number text-2xl font-bold text-white" data-value={numValue}>0</div>
          )}
          <div className="text-sm text-zinc-500">{label}</div>
        </div>
      </div>
      {sublabel && (
        <div className="text-xs text-zinc-600 mt-2">{sublabel}</div>
      )}
    </div>
  );
}

// Settings key for localStorage (synced with UserAppConfig when available)
const PRODUCTS_SETTINGS_KEY = 'isyncso_products_settings';

export default function Products() {
  const { user, companyId } = useUser();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Product type settings
  const [digitalEnabled, setDigitalEnabled] = useState(true);
  const [physicalEnabled, setPhysicalEnabled] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Create product modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [newProductData, setNewProductData] = useState({
    name: '',
    type: 'digital',
    status: 'draft'
  });

  // Refs for anime.js animations
  const headerRef = useRef(null);
  const statsRef = useRef(null);
  const productsGridRef = useRef(null);

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
  const saveSettings = async (digital, physical) => {
    const settings = { digitalEnabled: digital, physicalEnabled: physical };

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
    // Don't allow disabling both
    if (!checked && !physicalEnabled) {
      toast.error('At least one product type must be enabled');
      return;
    }
    setDigitalEnabled(checked);
    saveSettings(checked, physicalEnabled);
  };

  const handlePhysicalToggle = (checked) => {
    // Don't allow disabling both
    if (!checked && !digitalEnabled) {
      toast.error('At least one product type must be enabled');
      return;
    }
    setPhysicalEnabled(checked);
    saveSettings(digitalEnabled, checked);
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
          Product.list({ limit: 50 }).catch(() => []),
          ProductCategory.list({ limit: 50 }).catch(() => []),
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
    const published = products.filter(p => p.status === 'published');
    const draft = products.filter(p => p.status === 'draft');

    return {
      total: products.length,
      digital: digital.length,
      physical: physical.length,
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
        return true;
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 6);
  }, [products, digitalEnabled, physicalEnabled]);

  const filteredProducts = useMemo(() => {
    let filtered = products.filter(p => {
      if (p.type === 'digital' && !digitalEnabled) return false;
      if (p.type === 'physical' && !physicalEnabled) return false;
      return true;
    });

    if (!searchQuery.trim()) return filtered.slice(0, 6);

    const q = searchQuery.toLowerCase();
    return filtered.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.tagline?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [products, digitalEnabled, physicalEnabled, searchQuery]);

  // Animate header on mount
  useEffect(() => {
    if (!headerRef.current || prefersReducedMotion()) return;

    animate({
      targets: headerRef.current,
      translateY: [-20, 0],
      opacity: [0, 1],
      duration: 500,
      easing: 'easeOutQuart',
    });
  }, []);

  // Animate stats bar with count-up
  useEffect(() => {
    if (loading || !statsRef.current || prefersReducedMotion()) return;

    // Entrance animation for stats bar
    animate({
      targets: statsRef.current,
      translateY: [15, 0],
      opacity: [0, 1],
      duration: 400,
      easing: 'easeOutQuad',
      delay: 100,
    });

    // Count-up animation for stat numbers
    const statValues = statsRef.current.querySelectorAll('.stat-number');
    statValues.forEach(el => {
      const endValue = parseFloat(el.dataset.value) || 0;
      const obj = { value: 0 };

      animate({
        targets: obj,
        value: endValue,
        round: 1,
        duration: 1000,
        delay: 200,
        easing: 'easeOutExpo',
        update: () => {
          el.textContent = obj.value;
        },
      });
    });
  }, [loading, stats]);

  // Animate product cards when loaded
  useEffect(() => {
    if (loading || !productsGridRef.current || prefersReducedMotion()) return;

    const cards = productsGridRef.current.querySelectorAll('.product-card');
    if (cards.length === 0) return;

    // Set initial state
    Array.from(cards).forEach(card => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(25px) scale(0.96)';
    });

    // Staggered entrance animation
    animate({
      targets: cards,
      translateY: [25, 0],
      scale: [0.96, 1],
      opacity: [0, 1],
      delay: anime.stagger(40, { start: 150 }),
      duration: 450,
      easing: 'easeOutQuart',
    });
  }, [loading, filteredProducts]);

  return (
    <div className="min-h-screen bg-black relative">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-cyan-900/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-cyan-950/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full px-6 lg:px-8 py-6 space-y-6">
        {/* Page Header */}
        <div ref={headerRef} style={{ opacity: 0 }}>
          <PageHeader
            title="Products"
            subtitle="Manage your digital and physical product catalog"
            icon={Package}
            color="cyan"
          actions={
            <div className="flex items-center gap-3">
              {/* Settings Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-white/10 bg-zinc-900/60 text-zinc-300 hover:text-white hover:border-cyan-500/50 hover:bg-cyan-500/10"
                  >
                    <Settings className="w-4 h-4 mr-2" /> Settings
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 bg-zinc-900 border-white/10 p-4" align="end">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-white mb-1">Product Types</h4>
                      <p className="text-xs text-zinc-500">Enable or disable product categories</p>
                    </div>

                    {/* Digital Toggle */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                          <Cloud className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">Digital Products</div>
                          <div className="text-xs text-zinc-500">SaaS, software, courses</div>
                        </div>
                      </div>
                      <Switch
                        checked={digitalEnabled}
                        onCheckedChange={handleDigitalToggle}
                        disabled={settingsSaving}
                      />
                    </div>

                    {/* Physical Toggle */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                          <Box className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">Physical Products</div>
                          <div className="text-xs text-zinc-500">Hardware, goods, inventory</div>
                        </div>
                      </div>
                      <Switch
                        checked={physicalEnabled}
                        onCheckedChange={handlePhysicalToggle}
                        disabled={settingsSaving}
                      />
                    </div>

                    {settingsSaving && (
                      <div className="text-xs text-center text-zinc-500">Saving...</div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                variant="outline"
                className="border-white/10 bg-zinc-900/60 text-zinc-300 hover:text-white hover:border-cyan-500/50 hover:bg-cyan-500/10"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="w-4 h-4 mr-2" /> Add Product
              </Button>
            </div>
          }
          />
        </div>

        {/* Stats Row */}
        <div ref={statsRef} className={`grid gap-4 ${digitalEnabled && physicalEnabled ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6' : 'grid-cols-2 md:grid-cols-4'}`} style={{ opacity: 0 }}>
          <QuickStatCard
            icon={Package}
            label="Total Products"
            value={loading ? '-' : stats.total}
            color="cyan"
          />
          {digitalEnabled && (
            <QuickStatCard
              icon={Cloud}
              label="Digital"
              value={loading ? '-' : stats.digital}
              color="cyan"
            />
          )}
          {physicalEnabled && (
            <QuickStatCard
              icon={Box}
              label="Physical"
              value={loading ? '-' : stats.physical}
              color="cyan"
            />
          )}
          <QuickStatCard
            icon={Eye}
            label="Published"
            value={loading ? '-' : stats.published}
            color="green"
          />
          <QuickStatCard
            icon={Edit2}
            label="Drafts"
            value={loading ? '-' : stats.draft}
            color="cyan"
          />
          <QuickStatCard
            icon={Tag}
            label="Categories"
            value={loading ? '-' : stats.categories}
            color="cyan"
          />
        </div>

        {/* Quick Navigation Cards */}
        <div className={`grid gap-6 ${digitalEnabled && physicalEnabled ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
          {/* Digital Products Card */}
          {digitalEnabled && (
            <Link to={createPageUrl('ProductsDigital')}>
              <GlassCard className="p-6 group hover:border-cyan-500/30 transition-all cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                    <Cloud className="w-7 h-7 text-cyan-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors">
                      Digital Products
                    </h3>
                    <p className="text-sm text-zinc-400 mt-1">
                      Software, SaaS, courses, subscriptions, and downloadable content
                    </p>
                    <div className="flex items-center gap-4 mt-4">
                      <span className="text-2xl font-bold text-cyan-400">{stats.digital}</span>
                      <span className="text-sm text-zinc-500">products</span>
                      <ArrowRight className="w-4 h-4 text-zinc-500 ml-auto group-hover:text-cyan-400 transition-colors" />
                    </div>
                  </div>
                </div>
              </GlassCard>
            </Link>
          )}

          {/* Physical Products Card */}
          {physicalEnabled && (
            <Link to={createPageUrl('ProductsPhysical')}>
              <GlassCard className="p-6 group hover:border-cyan-500/30 transition-all cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                    <Box className="w-7 h-7 text-cyan-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors">
                      Physical Products
                    </h3>
                    <p className="text-sm text-zinc-400 mt-1">
                      Hardware, merchandise, equipment, and tangible goods
                    </p>
                    <div className="flex items-center gap-4 mt-4">
                      <span className="text-2xl font-bold text-cyan-400">{stats.physical}</span>
                      <span className="text-sm text-zinc-500">products</span>
                      <ArrowRight className="w-4 h-4 text-zinc-500 ml-auto group-hover:text-cyan-400 transition-colors" />
                    </div>
                  </div>
                </div>
              </GlassCard>
            </Link>
          )}
        </div>

        {/* Recent Products */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                <Layers className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Recent Products</h3>
                <p className="text-sm text-zinc-500">Your latest product additions</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64 bg-zinc-900/50 border-white/10 text-white placeholder:text-zinc-500"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-24 bg-zinc-800/50" />
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div ref={productsGridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((product, index) => (
                <div key={product.id} className="product-card">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-cyan-400" />
              </div>
              <h4 className="text-lg font-medium text-white mb-2">No products yet</h4>
              <p className="text-sm text-zinc-500 mb-4">
                {searchQuery ? 'No products match your search' : 'Get started by adding your first product'}
              </p>
              {!searchQuery && (
                <Button className="bg-cyan-500 hover:bg-cyan-600 text-white">
                  <Plus className="w-4 h-4 mr-2" /> Add Your First Product
                </Button>
              )}
            </div>
          )}

          {filteredProducts.length > 0 && (
            <div className="flex justify-center mt-6">
              <Link to={createPageUrl(digitalEnabled ? 'ProductsDigital' : 'ProductsPhysical')}>
                <Button variant="outline" className="border-white/10 text-zinc-400 hover:text-white">
                  View All Products <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          )}
        </GlassCard>

        {/* Categories Section */}
        {categories.length > 0 && (
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                <Tag className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Categories</h3>
                <p className="text-sm text-zinc-500">Organize products by category</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Badge
                  key={category.id}
                  className="bg-zinc-800/50 border border-white/10 text-zinc-300 hover:border-cyan-500/30 hover:text-cyan-400 cursor-pointer transition-colors"
                >
                  {category.name}
                  <span className="ml-2 text-xs text-zinc-500">
                    {products.filter(p => p.category_id === category.id).length}
                  </span>
                </Badge>
              ))}
            </div>
          </GlassCard>
        )}
      </div>

      {/* Create Product Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Create New Product</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Enter basic details to create a product. You can add more details after.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="product-name" className="text-zinc-300">Product Name</Label>
              <Input
                id="product-name"
                placeholder="Enter product name..."
                value={newProductData.name}
                onChange={(e) => setNewProductData(prev => ({ ...prev, name: e.target.value }))}
                className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Product Type</Label>
              <Select
                value={newProductData.type}
                onValueChange={(value) => setNewProductData(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="digital" className="text-white hover:bg-zinc-700">
                    <div className="flex items-center gap-2">
                      <Cloud className="w-4 h-4 text-cyan-400" />
                      Digital Product
                    </div>
                  </SelectItem>
                  <SelectItem value="physical" className="text-white hover:bg-zinc-700">
                    <div className="flex items-center gap-2">
                      <Box className="w-4 h-4 text-cyan-400" />
                      Physical Product
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Initial Status</Label>
              <Select
                value={newProductData.status}
                onValueChange={(value) => setNewProductData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="draft" className="text-white hover:bg-zinc-700">Draft</SelectItem>
                  <SelectItem value="published" className="text-white hover:bg-zinc-700">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              className="border-zinc-700 text-zinc-300 hover:text-white"
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
    </div>
  );
}
