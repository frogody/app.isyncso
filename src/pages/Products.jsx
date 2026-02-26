import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Package, Cloud, Box, Briefcase, Plus,
  Settings, Loader2, Layers, Link2, ChevronDown
} from "lucide-react";
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { ProductsPageTransition } from '@/components/products/ui';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useUser } from "@/components/context/UserContext";
import { Product } from "@/api/entities";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import ProductTypeContent from "@/components/products/ProductTypeContent";
import { ImportFromURLModal } from "@/components/products";

const PRODUCTS_SETTINGS_KEY = 'isyncso_products_settings';

const TABS = [
  { id: "all", label: "All", icon: Layers, alwaysShow: true },
  { id: "digital", label: "Digital", icon: Cloud, settingKey: "digitalEnabled" },
  { id: "physical", label: "Physical", icon: Box, settingKey: "physicalEnabled" },
  { id: "service", label: "Services", icon: Briefcase, settingKey: "serviceEnabled" },
];

export default function Products() {
  const { user, companyId } = useUser();
  const { theme, toggleTheme, t } = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "all");

  // Product type settings
  const [digitalEnabled, setDigitalEnabled] = useState(true);
  const [physicalEnabled, setPhysicalEnabled] = useState(true);
  const [serviceEnabled, setServiceEnabled] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Create product modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [newProductData, setNewProductData] = useState({
    name: '',
    type: 'digital',
    status: 'draft'
  });

  useEffect(() => {
    document.title = 'Products | iSyncSO';
    return () => { document.title = 'iSyncSO'; };
  }, []);

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
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

      if (user?.id) {
        try {
          const configs = await db.entities.UserAppConfig.filter({ user_id: user.id });
          if (configs.length > 0 && configs[0].products_settings) {
            const settings = configs[0].products_settings;
            setDigitalEnabled(settings.digitalEnabled ?? true);
            setPhysicalEnabled(settings.physicalEnabled ?? true);
            setServiceEnabled(settings.serviceEnabled ?? true);
            localStorage.setItem(PRODUCTS_SETTINGS_KEY, JSON.stringify(settings));
          }
        } catch (e) {
          console.error('Failed to load user app config:', e);
        }
      }
    };

    loadSettings();
  }, [user?.id]);

  const settingsMap = { digitalEnabled, physicalEnabled, serviceEnabled };

  const visibleTabs = TABS.filter(tab =>
    tab.alwaysShow || settingsMap[tab.settingKey]
  );

  // If current tab is hidden by settings, reset to "all"
  useEffect(() => {
    if (!visibleTabs.find(t => t.id === activeTab)) {
      setActiveTab("all");
      setSearchParams({ tab: "all" }, { replace: true });
    }
  }, [digitalEnabled, physicalEnabled, serviceEnabled]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId }, { replace: true });
  };

  // Save settings
  const saveSettings = async (digital, physical, service) => {
    const settings = { digitalEnabled: digital, physicalEnabled: physical, serviceEnabled: service };
    localStorage.setItem(PRODUCTS_SETTINGS_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('products-settings-changed', { detail: settings }));

    if (user?.id) {
      setSettingsSaving(true);
      try {
        const configs = await db.entities.UserAppConfig.filter({ user_id: user.id });
        if (configs.length > 0) {
          await db.entities.UserAppConfig.update(configs[0].id, { products_settings: settings });
        } else {
          await db.entities.UserAppConfig.create({ user_id: user.id, products_settings: settings });
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

  const handleCreateProduct = async () => {
    if (!newProductData.name.trim()) {
      toast.error('Please enter a product name');
      return;
    }

    setCreatingProduct(true);
    try {
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
      navigate(createPageUrl('ProductDetail') + `?type=${created.type}&slug=${created.slug}`);
    } catch (error) {
      console.error('Failed to create product:', error);
      toast.error('Failed to create product: ' + (error.message || 'Unknown error'));
    } finally {
      setCreatingProduct(false);
    }
  };

  return (
    <ProductsPageTransition className={cn("min-h-screen", t('bg-slate-50', 'bg-black'))}>
      <div className="max-w-full mx-auto px-4 lg:px-6 py-4 space-y-4">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h1 className={cn("text-lg font-bold", t('text-slate-900', 'text-white'))}>Products</h1>
            <p className={cn("text-xs", t('text-slate-500', 'text-zinc-400'))}>Manage your product catalog</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              className={cn("border", t('border-slate-200 bg-white text-slate-600 hover:bg-slate-100', 'border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700'))}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>

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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-cyan-600/80 hover:bg-cyan-600 text-white">
                  <Plus className="w-4 h-4 mr-1" /> Add Product <ChevronDown className="w-3.5 h-3.5 ml-1 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className={cn("w-52 border", t('bg-white border-slate-200', 'bg-zinc-900 border-zinc-800'))}>
                <DropdownMenuItem
                  onClick={() => setShowCreateModal(true)}
                  className={cn("cursor-pointer", t('text-slate-700 hover:bg-slate-50', 'text-zinc-300 hover:bg-zinc-800'))}
                >
                  <Plus className="w-4 h-4 mr-2 text-cyan-400" /> New Product
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowImportModal(true)}
                  className={cn("cursor-pointer", t('text-slate-700 hover:bg-slate-50', 'text-zinc-300 hover:bg-zinc-800'))}
                >
                  <Link2 className="w-4 h-4 mr-2 text-cyan-400" /> Import from URL
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Tab Bar */}
        <div className={cn("flex items-center gap-1 p-1 rounded-xl", t("bg-slate-100 border border-slate-200", "bg-zinc-900/60 border border-zinc-800/60"))}>
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex-1 justify-center",
                  isActive
                    ? cn(t("bg-white shadow-sm", "bg-zinc-800"), "text-cyan-400")
                    : t("text-slate-500 hover:text-slate-700 hover:bg-slate-50", "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50")
                )}
              >
                <Icon className={cn("w-4 h-4", isActive && "text-cyan-400")} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <ProductTypeContent productType={activeTab} />
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

      {/* Import from URL Modal */}
      <ImportFromURLModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSave={(product) => {
          if (product?.slug) {
            navigate(createPageUrl('ProductDetail') + `?type=physical&slug=${product.slug}`);
          }
        }}
      />
    </ProductsPageTransition>
  );
}
