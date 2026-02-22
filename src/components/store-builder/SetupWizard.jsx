// ---------------------------------------------------------------------------
// SetupWizard.jsx -- 4-step onboarding wizard for first-time B2B store setup.
// Collects business info, product selection, template choice, and subdomain.
// ---------------------------------------------------------------------------

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Package,
  Palette,
  Globe,
  ChevronRight,
  ChevronLeft,
  Upload,
  X,
  Check,
  Loader2,
  Search,
  AlertCircle,
  Sparkles,
  Image as ImageIcon,
} from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { STORE_TEMPLATES } from './utils/storeTemplates';
import { DEFAULT_STORE_CONFIG } from './utils/storeDefaults';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INDUSTRIES = [
  'General',
  'Technology / Electronics',
  'Manufacturing',
  'Fashion / Apparel',
  'Food & Beverage',
  'Health & Beauty',
  'Home & Garden',
  'Automotive',
  'Construction',
  'Other',
];

const STEPS = [
  { key: 'business', label: 'Business Info', icon: Building2 },
  { key: 'products', label: 'Products', icon: Package },
  { key: 'template', label: 'Template', icon: Palette },
  { key: 'domain', label: 'Domain', icon: Globe },
];

const SUBDOMAIN_REGEX = /^[a-z0-9][a-z0-9-]{1,}[a-z0-9]$/;

// ---------------------------------------------------------------------------
// Step Indicator
// ---------------------------------------------------------------------------

function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center justify-center gap-2 px-6 pt-6 pb-2">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const isActive = i === currentStep;
        const isDone = i < currentStep;

        return (
          <React.Fragment key={step.key}>
            {i > 0 && (
              <div
                className={`hidden sm:block h-px flex-1 max-w-12 transition-colors duration-300 ${
                  isDone ? 'bg-cyan-500' : 'bg-zinc-800'
                }`}
              />
            )}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isActive
                    ? 'bg-cyan-500/15 ring-2 ring-cyan-500 text-cyan-400'
                    : isDone
                    ? 'bg-cyan-500 text-white'
                    : 'bg-zinc-800/60 text-zinc-500'
                }`}
              >
                {isDone ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <span
                className={`text-[11px] font-medium whitespace-nowrap transition-colors duration-300 ${
                  isActive ? 'text-cyan-400' : isDone ? 'text-zinc-300' : 'text-zinc-600'
                }`}
              >
                {step.label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1 -- Business Info
// ---------------------------------------------------------------------------

function BusinessInfoStep({ data, onChange, user }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleLogoUpload = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file
      if (!file.type.startsWith('image/')) return;
      if (file.size > 10 * 1024 * 1024) return; // 10MB limit per brand-assets bucket

      setUploading(true);
      try {
        const ext = file.name.split('.').pop();
        const path = `${user?.company_id || 'unknown'}/${Date.now()}_logo.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('brand-assets')
          .upload(path, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('brand-assets')
          .getPublicUrl(path);

        onChange({ logoUrl: urlData.publicUrl, logoPath: path });
      } catch (err) {
        console.error('Logo upload failed:', err);
      } finally {
        setUploading(false);
      }
    },
    [user, onChange],
  );

  const removeLogo = useCallback(() => {
    onChange({ logoUrl: null, logoPath: null });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [onChange]);

  return (
    <div className="space-y-5">
      {/* Company Name */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1.5">
          Company Name
        </label>
        <input
          type="text"
          value={data.companyName}
          onChange={(e) => onChange({ companyName: e.target.value })}
          placeholder="Your company name"
          className="w-full bg-zinc-800/60 border border-zinc-700/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 transition-all"
        />
      </div>

      {/* Business Description */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1.5">
          Business Description
        </label>
        <textarea
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Describe your business and what you sell..."
          rows={3}
          className="w-full bg-zinc-800/60 border border-zinc-700/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 transition-all resize-none"
        />
      </div>

      {/* Industry */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1.5">
          Industry
        </label>
        <select
          value={data.industry}
          onChange={(e) => onChange({ industry: e.target.value })}
          className="w-full bg-zinc-800/60 border border-zinc-700/60 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 transition-all appearance-none cursor-pointer"
        >
          {INDUSTRIES.map((ind) => (
            <option key={ind} value={ind} className="bg-zinc-900">
              {ind}
            </option>
          ))}
        </select>
      </div>

      {/* Logo Upload */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1.5">
          Logo
        </label>
        {data.logoUrl ? (
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-zinc-800/60 border border-zinc-700/60 flex items-center justify-center overflow-hidden">
              <img
                src={data.logoUrl}
                alt="Logo preview"
                className="w-full h-full object-contain p-1"
              />
            </div>
            <button
              onClick={removeLogo}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-red-400 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Remove
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 py-6 border-2 border-dashed border-zinc-700/60 rounded-xl text-sm text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-all cursor-pointer disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload your logo
              </>
            )}
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleLogoUpload}
          className="hidden"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 -- Select Products
// ---------------------------------------------------------------------------

function SelectProductsStep({ data, onChange }) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-zinc-400">
        Choose which products to display in your B2B store.
      </p>

      <div className="space-y-3">
        {/* All products */}
        <label
          className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
            data.productSelection === 'all'
              ? 'border-cyan-500/50 bg-cyan-500/5'
              : 'border-zinc-700/60 bg-zinc-800/30 hover:border-zinc-600'
          }`}
        >
          <input
            type="radio"
            name="productSelection"
            value="all"
            checked={data.productSelection === 'all'}
            onChange={() => onChange({ productSelection: 'all', selectedProductIds: [] })}
            className="sr-only"
          />
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
              data.productSelection === 'all'
                ? 'border-cyan-500 bg-cyan-500'
                : 'border-zinc-600'
            }`}
          >
            {data.productSelection === 'all' && (
              <div className="w-2 h-2 rounded-full bg-white" />
            )}
          </div>
          <div>
            <span className="text-sm font-medium text-white">
              All B2B-channel products
            </span>
            <p className="text-xs text-zinc-500 mt-0.5">
              Automatically include every product assigned to your B2B sales channel.
            </p>
          </div>
        </label>

        {/* Select specific */}
        <label
          className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
            data.productSelection === 'specific'
              ? 'border-cyan-500/50 bg-cyan-500/5'
              : 'border-zinc-700/60 bg-zinc-800/30 hover:border-zinc-600'
          }`}
        >
          <input
            type="radio"
            name="productSelection"
            value="specific"
            checked={data.productSelection === 'specific'}
            onChange={() => onChange({ productSelection: 'specific' })}
            className="sr-only"
          />
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
              data.productSelection === 'specific'
                ? 'border-cyan-500 bg-cyan-500'
                : 'border-zinc-600'
            }`}
          >
            {data.productSelection === 'specific' && (
              <div className="w-2 h-2 rounded-full bg-white" />
            )}
          </div>
          <div>
            <span className="text-sm font-medium text-white">
              Select specific products
            </span>
            <p className="text-xs text-zinc-500 mt-0.5">
              Hand-pick exactly which products appear in your store.
            </p>
          </div>
        </label>
      </div>

      {data.productSelection === 'specific' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="rounded-xl border border-zinc-700/60 bg-zinc-800/30 p-4"
        >
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Package className="w-4 h-4" />
            <span>
              Product selection will be available in a future update. All B2B products
              will be included for now.
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 -- Choose Template
// ---------------------------------------------------------------------------

function ChooseTemplateStep({ data, onChange }) {
  // Template color map for thumbnail placeholder backgrounds
  const templateThemeColors = useMemo(
    () =>
      STORE_TEMPLATES.reduce((acc, tpl) => {
        acc[tpl.id] = tpl.config.theme.primaryColor;
        return acc;
      }, {}),
    [],
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">
        Pick a starting template for your store. You can customize everything later.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1 -mr-1">
        {STORE_TEMPLATES.map((tpl) => {
          const isSelected = data.templateId === tpl.id;
          const themeColor = templateThemeColors[tpl.id] || '#06b6d4';
          const isDarkTpl = tpl.config.theme.mode === 'dark';

          return (
            <button
              key={tpl.id}
              onClick={() => onChange({ templateId: tpl.id })}
              className={`text-left rounded-xl border p-3 transition-all ${
                isSelected
                  ? 'border-cyan-500 ring-2 ring-cyan-500/25 bg-cyan-500/5'
                  : 'border-zinc-700/60 bg-zinc-800/30 hover:border-zinc-600'
              }`}
            >
              {/* Thumbnail placeholder */}
              <div
                className="w-full h-24 rounded-lg mb-2.5 flex items-center justify-center overflow-hidden"
                style={{
                  background: isDarkTpl
                    ? `linear-gradient(135deg, ${tpl.config.theme.backgroundColor} 0%, ${tpl.config.theme.surfaceColor} 100%)`
                    : `linear-gradient(135deg, ${tpl.config.theme.surfaceColor} 0%, ${tpl.config.theme.backgroundColor} 100%)`,
                }}
              >
                {tpl.thumbnail ? (
                  <img
                    src={tpl.thumbnail}
                    alt={tpl.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Palette
                      className="w-5 h-5"
                      style={{ color: themeColor }}
                    />
                    <span
                      className="text-[10px] font-medium"
                      style={{ color: themeColor }}
                    >
                      {tpl.name}
                    </span>
                  </div>
                )}
              </div>

              <h4 className="text-sm font-medium text-white">{tpl.name}</h4>
              <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
                {tpl.description}
              </p>
            </button>
          );
        })}

        {/* Start from Scratch */}
        <button
          onClick={() => onChange({ templateId: 'scratch' })}
          className={`text-left rounded-xl border p-3 transition-all ${
            data.templateId === 'scratch'
              ? 'border-cyan-500 ring-2 ring-cyan-500/25 bg-cyan-500/5'
              : 'border-zinc-700/60 bg-zinc-800/30 hover:border-zinc-600'
          }`}
        >
          <div className="w-full h-24 rounded-lg mb-2.5 bg-zinc-800/80 flex items-center justify-center border border-dashed border-zinc-700">
            <div className="flex flex-col items-center gap-1">
              <Sparkles className="w-5 h-5 text-zinc-500" />
              <span className="text-[10px] font-medium text-zinc-500">
                Blank Canvas
              </span>
            </div>
          </div>
          <h4 className="text-sm font-medium text-white">Start from Scratch</h4>
          <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
            Begin with a blank store and build every section from the ground up.
          </p>
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4 -- Choose Domain
// ---------------------------------------------------------------------------

function ChooseDomainStep({ data, onChange }) {
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState(null); // null | true | false
  const debounceRef = useRef(null);

  const isValid = useMemo(() => {
    const val = data.subdomain || '';
    return val.length >= 3 && SUBDOMAIN_REGEX.test(val);
  }, [data.subdomain]);

  const checkAvailability = useCallback(
    async (subdomain) => {
      if (!subdomain || subdomain.length < 3 || !SUBDOMAIN_REGEX.test(subdomain)) {
        setAvailable(null);
        return;
      }

      setChecking(true);
      try {
        const { data: existing, error } = await supabase
          .from('portal_settings')
          .select('id')
          .eq('store_subdomain', subdomain)
          .maybeSingle();

        if (error) {
          console.error('Subdomain check error:', error);
          setAvailable(null);
        } else {
          setAvailable(!existing);
        }
      } catch (err) {
        console.error('Subdomain check failed:', err);
        setAvailable(null);
      } finally {
        setChecking(false);
      }
    },
    [],
  );

  const handleSubdomainChange = useCallback(
    (raw) => {
      const cleaned = raw.toLowerCase().replace(/[^a-z0-9-]/g, '');
      onChange({ subdomain: cleaned });
      setAvailable(null);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => checkAvailability(cleaned), 500);
    },
    [onChange, checkAvailability],
  );

  return (
    <div className="space-y-5">
      <p className="text-sm text-zinc-400">
        Choose a subdomain for your B2B store. Your customers will visit this
        address.
      </p>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1.5">
          Store URL
        </label>
        <div className="flex items-center gap-0">
          <input
            type="text"
            value={data.subdomain}
            onChange={(e) => handleSubdomainChange(e.target.value)}
            placeholder="your-store"
            maxLength={48}
            className="flex-1 bg-zinc-800/60 border border-zinc-700/60 border-r-0 rounded-l-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 transition-all"
          />
          <div className="bg-zinc-800/80 border border-zinc-700/60 rounded-r-xl px-4 py-2.5 text-sm text-zinc-500 whitespace-nowrap select-none">
            .syncstore.business
          </div>
        </div>

        {/* Validation feedback */}
        <div className="mt-2 min-h-[20px]">
          {data.subdomain && data.subdomain.length > 0 && data.subdomain.length < 3 && (
            <p className="flex items-center gap-1.5 text-xs text-zinc-500">
              <AlertCircle className="w-3.5 h-3.5" />
              Must be at least 3 characters
            </p>
          )}

          {data.subdomain && data.subdomain.length >= 3 && !isValid && (
            <p className="flex items-center gap-1.5 text-xs text-red-400">
              <AlertCircle className="w-3.5 h-3.5" />
              Only lowercase letters, numbers, and hyphens. Cannot start or end with a
              hyphen.
            </p>
          )}

          {isValid && checking && (
            <p className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Checking availability...
            </p>
          )}

          {isValid && !checking && available === true && (
            <p className="flex items-center gap-1.5 text-xs text-emerald-400">
              <Check className="w-3.5 h-3.5" />
              {data.subdomain}.syncstore.business is available
            </p>
          )}

          {isValid && !checking && available === false && (
            <p className="flex items-center gap-1.5 text-xs text-red-400">
              <X className="w-3.5 h-3.5" />
              That subdomain is already taken
            </p>
          )}
        </div>
      </div>

      {/* Preview card */}
      {isValid && available === true && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-zinc-700/60 bg-zinc-800/30 p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-white">Your store will be live at</span>
          </div>
          <p className="text-sm text-cyan-400 font-mono">
            https://{data.subdomain}.syncstore.business
          </p>
        </motion.div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const stepVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction > 0 ? -40 : 40,
    opacity: 0,
  }),
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function SetupWizard({ onComplete, user }) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [creating, setCreating] = useState(false);

  // Wizard data
  const [businessInfo, setBusinessInfo] = useState({
    companyName: user?.full_name || '',
    description: '',
    industry: 'General',
    logoUrl: null,
    logoPath: null,
  });

  const [productData, setProductData] = useState({
    productSelection: 'all',
    selectedProductIds: [],
  });

  const [templateData, setTemplateData] = useState({
    templateId: STORE_TEMPLATES[0]?.id || 'scratch',
  });

  const [domainData, setDomainData] = useState({
    subdomain: '',
  });

  // Updaters
  const updateBusiness = useCallback(
    (patch) => setBusinessInfo((prev) => ({ ...prev, ...patch })),
    [],
  );
  const updateProducts = useCallback(
    (patch) => setProductData((prev) => ({ ...prev, ...patch })),
    [],
  );
  const updateTemplate = useCallback(
    (patch) => setTemplateData((prev) => ({ ...prev, ...patch })),
    [],
  );
  const updateDomain = useCallback(
    (patch) => setDomainData((prev) => ({ ...prev, ...patch })),
    [],
  );

  // Validation per step
  const canProceed = useMemo(() => {
    switch (step) {
      case 0:
        return businessInfo.companyName.trim().length > 0;
      case 1:
        return true; // always valid
      case 2:
        return !!templateData.templateId;
      case 3: {
        const sub = domainData.subdomain;
        return sub.length >= 3 && SUBDOMAIN_REGEX.test(sub);
      }
      default:
        return false;
    }
  }, [step, businessInfo, templateData, domainData]);

  // Navigation
  const goNext = useCallback(() => {
    if (step < STEPS.length - 1) {
      setDirection(1);
      setStep((s) => s + 1);
    }
  }, [step]);

  const goBack = useCallback(() => {
    if (step > 0) {
      setDirection(-1);
      setStep((s) => s - 1);
    }
  }, [step]);

  // Build final config and submit
  const handleCreate = useCallback(async () => {
    setCreating(true);

    try {
      const businessName = businessInfo.companyName.trim();

      // Pick base config
      let baseConfig;
      if (templateData.templateId === 'scratch') {
        baseConfig = JSON.parse(JSON.stringify(DEFAULT_STORE_CONFIG));
      } else {
        const template = STORE_TEMPLATES.find((t) => t.id === templateData.templateId);
        baseConfig = template
          ? JSON.parse(JSON.stringify(template.config))
          : JSON.parse(JSON.stringify(DEFAULT_STORE_CONFIG));
      }

      // Merge business info into hero section
      const heroSection = baseConfig.sections?.find(
        (s) => s.type === 'hero',
      );
      if (heroSection) {
        heroSection.props.heading = `${businessName} - Wholesale Store`;
        if (businessInfo.description) {
          heroSection.props.subheading = businessInfo.description;
        }
      }

      // Navigation company name
      if (baseConfig.navigation) {
        baseConfig.navigation.companyName = businessName;
      }

      // Footer copyright
      if (baseConfig.footer) {
        baseConfig.footer.copyright = `\u00a9 ${new Date().getFullYear()} ${businessName}`;
      }

      // SEO
      if (baseConfig.seo) {
        baseConfig.seo.title = `${businessName} - Wholesale Store`;
        if (businessInfo.description) {
          baseConfig.seo.description = businessInfo.description;
        }
      }

      // Attach wizard metadata
      const finalConfig = {
        ...baseConfig,
        _wizardMeta: {
          businessName,
          description: businessInfo.description,
          industry: businessInfo.industry,
          logoUrl: businessInfo.logoUrl,
          logoPath: businessInfo.logoPath,
          productSelection: productData.productSelection,
          selectedProductIds: productData.selectedProductIds,
          templateId: templateData.templateId,
          subdomain: domainData.subdomain,
        },
      };

      onComplete(finalConfig);
    } catch (err) {
      console.error('SetupWizard: create failed', err);
    } finally {
      setCreating(false);
    }
  }, [businessInfo, productData, templateData, domainData, onComplete]);

  // Is this the final step?
  const isFinalStep = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#09090b]/95 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative w-full max-w-2xl mx-4 bg-zinc-900 rounded-2xl border border-zinc-800/60 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Step indicator */}
        <StepIndicator currentStep={step} />

        {/* Step title */}
        <div className="px-6 pt-3 pb-1">
          <h2 className="text-lg font-semibold text-white">
            {STEPS[step].label}
          </h2>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
              {step === 0 && (
                <BusinessInfoStep
                  data={businessInfo}
                  onChange={updateBusiness}
                  user={user}
                />
              )}
              {step === 1 && (
                <SelectProductsStep
                  data={productData}
                  onChange={updateProducts}
                />
              )}
              {step === 2 && (
                <ChooseTemplateStep
                  data={templateData}
                  onChange={updateTemplate}
                />
              )}
              {step === 3 && (
                <ChooseDomainStep
                  data={domainData}
                  onChange={updateDomain}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800/60">
          <button
            onClick={goBack}
            disabled={step === 0}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              step === 0
                ? 'text-zinc-600 cursor-not-allowed'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          {isFinalStep ? (
            <button
              onClick={handleCreate}
              disabled={!canProceed || creating}
              className="flex items-center gap-2 px-5 py-2 bg-cyan-600 text-white rounded-xl text-sm font-medium hover:bg-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Create Store
                </>
              )}
            </button>
          ) : (
            <button
              onClick={goNext}
              disabled={!canProceed}
              className="flex items-center gap-1.5 px-5 py-2 bg-cyan-600 text-white rounded-xl text-sm font-medium hover:bg-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
