/**
 * Growth Campaign Wizard Page
 * Multi-step wizard for setting up targeted outreach campaigns
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  Save,
  Rocket,
  Package,
  Users,
  Target,
  Lightbulb,
  FileCheck,
  Plus,
  Trash2,
  Upload,
  Database,
  ShoppingBag,
  Sparkles,
  Building2,
  Briefcase,
  Globe,
  DollarSign,
  Clock,
  Mail,
  Linkedin,
  Phone,
  Calendar,
  TrendingUp,
  AlertCircle,
  Zap,
  Search,
  HelpCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useUser } from '@/components/context/UserContext';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';

// Constants
const STORAGE_KEY = 'growth_campaign_draft';
const ENRICHMENT_COST_PER_PROSPECT = 0.5; // Credits per prospect

const STEPS = [
  { id: 1, title: 'Your Product', icon: Package, description: 'What are you selling?' },
  { id: 2, title: 'Target Audience', icon: Users, description: 'Define your ICP' },
  { id: 3, title: 'Campaign Goals', icon: Target, description: 'Set your objectives' },
  { id: 4, title: 'Correlation Insights', icon: Lightbulb, description: 'Buying signals' },
  { id: 5, title: 'Review & Launch', icon: FileCheck, description: 'Finalize campaign' },
];

// Options for selects
const PRICE_RANGES = [
  { value: 'under_1k', label: 'Under $1,000' },
  { value: '1k_10k', label: '$1,000 - $10,000' },
  { value: '10k_50k', label: '$10,000 - $50,000' },
  { value: '50k_100k', label: '$50,000 - $100,000' },
  { value: 'over_100k', label: '$100,000+' },
];

const SALES_CYCLES = [
  { value: 'under_1week', label: 'Under 1 week' },
  { value: '1_4_weeks', label: '1-4 weeks' },
  { value: '1_3_months', label: '1-3 months' },
  { value: '3_6_months', label: '3-6 months' },
  { value: 'over_6_months', label: '6+ months' },
];

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'E-commerce',
  'Manufacturing',
  'Professional Services',
  'Retail',
  'Education',
  'Real Estate',
  'Other',
];

const COMPANY_SIZES = [
  { value: '1-10', label: '1-10' },
  { value: '11-50', label: '11-50' },
  { value: '51-200', label: '51-200' },
  { value: '201-500', label: '201-500' },
  { value: '501-1000', label: '501-1,000' },
  { value: '1000+', label: '1,000+' },
];

const REVENUE_RANGES = [
  { value: 'under_1m', label: 'Under $1M' },
  { value: '1m_10m', label: '$1M - $10M' },
  { value: '10m_50m', label: '$10M - $50M' },
  { value: '50m_100m', label: '$50M - $100M' },
  { value: 'over_100m', label: '$100M+' },
];

const REGIONS = [
  { value: 'north_america', label: 'North America' },
  { value: 'europe', label: 'Europe' },
  { value: 'apac', label: 'APAC' },
  { value: 'latam', label: 'LATAM' },
  { value: 'middle_east', label: 'Middle East' },
];

const SENIORITY_LEVELS = [
  { value: 'c_level', label: 'C-Level' },
  { value: 'vp', label: 'VP' },
  { value: 'director', label: 'Director' },
  { value: 'manager', label: 'Manager' },
  { value: 'individual_contributor', label: 'Individual Contributor' },
];

const DEPARTMENTS = [
  'Sales',
  'Marketing',
  'Engineering',
  'IT',
  'Operations',
  'HR',
  'Finance',
  'Product',
  'Customer Success',
];

const CAMPAIGN_GOALS = [
  { value: 'book_meetings', label: 'Book meetings/demos', icon: Calendar },
  { value: 'generate_leads', label: 'Generate leads for nurturing', icon: Users },
  { value: 'event_registrations', label: 'Drive event registrations', icon: Rocket },
  { value: 'promote_content', label: 'Promote content/webinar', icon: FileCheck },
];

const BUYING_SIGNALS = [
  { id: 'recent_funding', label: 'Recent funding round', icon: DollarSign },
  { id: 'new_executive', label: 'New executive hire', icon: Briefcase },
  { id: 'company_expansion', label: 'Company expansion/new office', icon: Building2 },
  { id: 'job_postings', label: 'Job postings in relevant areas', icon: Users },
  { id: 'tech_stack_changes', label: 'Tech stack changes', icon: Zap },
  { id: 'competitor_mention', label: 'Competitor mentioned in news', icon: TrendingUp },
];

// Nests are loaded from database

// Initial form state
const getInitialState = () => ({
  // Step 1: Product
  campaignName: '',
  productId: null,
  selectedProduct: null,
  productDescription: '',
  problemSolved: '',
  idealBuyer: '',
  priceRange: '',
  salesCycle: '',

  // Step 2: ICP
  industries: [],
  companySizes: [],
  revenueRanges: [],
  regions: [],
  jobTitles: [],
  seniorityLevels: [],
  departments: [],

  // Step 3: Goals
  primaryGoal: '',
  prospectCount: 100,
  targetResponseRate: 15,
  targetMeetings: 15,
  channels: {
    email: true,
    linkedin: false,
    phone: false,
  },

  // Step 4: Correlations
  buyingSignals: [],
  customQuestions: ['', '', ''],
  personalizationAngles: '',
  triggerIndicators: '',

  // Step 5: Data source
  dataSource: 'find_new', // 'existing_nest', 'find_new', 'upload_csv'
  selectedNestId: '',

  // Internal
  _aiAnalyzed: false,
});

// Animation variants
const pageVariants = {
  initial: (direction) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  animate: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 300, damping: 30 },
  },
  exit: (direction) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
    transition: { duration: 0.2 },
  }),
};

// Glass card component
const GlassCard = ({ children, className = '' }) => (
  <div className={`rounded-xl bg-zinc-900/50 border border-white/5 ${className}`}>
    {children}
  </div>
);

// Multi-select chip component
function ChipSelect({ options, selected, onChange, renderLabel }) {
  const toggleOption = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const value = typeof option === 'string' ? option : option.value;
        const label = renderLabel
          ? renderLabel(option)
          : typeof option === 'string'
          ? option
          : option.label;
        const isSelected = selected.includes(value);

        return (
          <button
            key={value}
            type="button"
            onClick={() => toggleOption(value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              isSelected
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50'
                : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// Tag input for job titles
function TagInput({ tags, onChange, placeholder }) {
  const [inputValue, setInputValue] = useState('');

  const addTag = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
      setInputValue('');
    }
  };

  const removeTag = (tag) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="bg-zinc-900/50 border-zinc-700"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addTag}
          className="border-zinc-700"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge
              key={tag}
              className="bg-indigo-500/20 text-indigo-400 border-indigo-500/50 pl-2 pr-1 py-1"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 hover:text-indigo-300"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// Progress indicator
function ProgressIndicator({ currentStep, steps }) {
  return (
    <div className="flex items-center justify-start gap-2">
      {steps.map((step, index) => {
        const StepIcon = step.icon;
        const isActive = currentStep === step.id;
        const isCompleted = currentStep > step.id;

        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  isCompleted
                    ? 'bg-indigo-500 text-white'
                    : isActive
                    ? 'bg-indigo-500/20 text-indigo-400 border-2 border-indigo-500'
                    : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <StepIcon className="w-5 h-5" />
                )}
              </div>
              <span
                className={`text-xs mt-1 hidden md:block ${
                  isActive ? 'text-indigo-400' : 'text-zinc-500'
                }`}
              >
                {step.title}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-8 md:w-16 h-0.5 ${
                  isCompleted ? 'bg-indigo-500' : 'bg-zinc-700'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Product types for the quick-add form
const PRODUCT_TYPES = [
  { value: 'saas', label: 'SaaS' },
  { value: 'digital', label: 'Digital Product' },
  { value: 'service', label: 'Service' },
  { value: 'physical', label: 'Physical Product' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'course', label: 'Course / Training' },
];

// Step 1: Product/Service
function Step1Product({ formData, setFormData, products, productsLoading, onProductCreated }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newProduct, setNewProduct] = useState({
    name: '',
    type: 'saas',
    description: '',
    short_description: '',
    price: '',
  });
  const { user } = useUser();

  // Filter products by search query
  const filteredProducts = products.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (p.tagline || '').toLowerCase().includes(q) ||
      (p.short_description || '').toLowerCase().includes(q) ||
      (p.type || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    );
  });
  const displayProducts = filteredProducts.slice(0, 6);
  const hasMore = filteredProducts.length > 6;

  const handleSelectProduct = async (product) => {
    if (formData.productId === product.id) {
      setFormData({ ...formData, productId: null, selectedProduct: null, productDescription: '', _aiAnalyzed: false });
    } else {
      // Also fetch digital product details if it's a digital product
      let enrichedProduct = { ...product };
      if (product.type === 'digital') {
        try {
          const { data: dpData } = await supabase
            .from('digital_products')
            .select('pricing_model, features, trial_available, trial_days, demo_url, packages, integrations, ai_context')
            .eq('product_id', product.id)
            .single();
          if (dpData) {
            enrichedProduct.digitalDetails = dpData;
          }
        } catch (e) { /* optional enrichment, ignore errors */ }
      }
      setFormData({
        ...formData,
        productId: product.id,
        selectedProduct: enrichedProduct,
        productDescription: product.description || product.short_description || '',
        problemSolved: product.tagline || product.short_description || formData.problemSolved || '',
        _aiAnalyzed: false, // Reset so AI re-analyzes on next
      });
      setShowAddForm(false);
    }
  };

  const handleCreateProduct = async () => {
    if (!newProduct.name.trim()) { toast.error('Product name is required'); return; }
    if (!newProduct.description.trim()) { toast.error('Product description is required'); return; }
    setSaving(true);
    try {
      const slug = newProduct.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const { data, error } = await supabase
        .from('products')
        .insert({
          company_id: user?.company_id,
          name: newProduct.name.trim(),
          slug,
          type: newProduct.type,
          description: newProduct.description.trim(),
          short_description: newProduct.short_description.trim() || null,
          price: newProduct.price ? parseFloat(newProduct.price) : null,
          status: 'published',
        })
        .select('id, name, type, description, short_description, price, featured_image, status, tagline, category')
        .single();

      if (error) throw error;

      toast.success(`${data.name} added to your products`);
      setShowAddForm(false);
      setNewProduct({ name: '', type: 'saas', description: '', short_description: '', price: '' });
      // Add to products list and select it
      if (onProductCreated) onProductCreated(data);
      setFormData({
        ...formData,
        productId: data.id,
        selectedProduct: data,
        productDescription: data.description || '',
        problemSolved: data.short_description || formData.problemSolved || '',
      });
    } catch (err) {
      console.error('Error creating product:', err);
      toast.error('Failed to create product');
    } finally {
      setSaving(false);
    }
  };

  const hasSelectedProduct = formData.productId && formData.selectedProduct;

  return (
    <div className="space-y-6">
      {/* Campaign Name */}
      <div>
        <Label htmlFor="campaignName" className="text-zinc-300">Campaign Name *</Label>
        <Input
          id="campaignName"
          value={formData.campaignName}
          onChange={(e) => setFormData({ ...formData, campaignName: e.target.value })}
          placeholder="e.g., Q1 2026 Tech Leaders Outreach"
          className="mt-1.5 bg-zinc-900/50 border-zinc-700"
        />
      </div>

      {/* Product Selection */}
      <div>
        <Label className="text-zinc-300 mb-3 block">Select your Product / Service *</Label>
        <p className="text-sm text-zinc-500 mb-4">Choose which product you're selling in this campaign, or add a new one.</p>

        {/* Loading */}
        {productsLoading && (
          <div className="grid md:grid-cols-2 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-zinc-800/50 rounded-xl h-28" />
            ))}
          </div>
        )}

        {/* Search bar + Product cards grid + Add card */}
        {!productsLoading && !showAddForm && (
          <>
            {/* Search bar */}
            {products.length > 4 && (
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search your products..."
                  className="pl-10 bg-zinc-900/50 border-zinc-700"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Results count when searching */}
            {searchQuery && (
              <p className="text-xs text-zinc-500 mb-2">
                {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
                {hasMore && ` (showing first 6)`}
              </p>
            )}

            <div className="grid md:grid-cols-2 gap-3">
              {displayProducts.map((product) => {
                const isSelected = formData.productId === product.id;
                const imgSrc = typeof product.featured_image === 'string'
                  ? product.featured_image
                  : product.featured_image?.url || null;
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleSelectProduct(product)}
                    className={`relative p-4 rounded-xl border transition-all text-left flex gap-3 ${
                      isSelected
                        ? 'border-cyan-500/50 bg-cyan-500/5 ring-1 ring-cyan-500/30'
                        : 'border-zinc-700 hover:border-zinc-500 bg-zinc-900/30'
                    }`}
                  >
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center overflow-hidden">
                      {imgSrc ? (
                        <img src={imgSrc} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <Package className="w-5 h-5 text-zinc-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white truncate">{product.name}</span>
                        {product.type && (
                          <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            {product.type}
                          </span>
                        )}
                      </div>
                      {(product.tagline || product.short_description) && (
                        <p className="text-sm text-zinc-400 mt-0.5 line-clamp-2">{product.tagline || product.short_description}</p>
                      )}
                      {product.price != null && (
                        <p className="text-xs text-zinc-500 mt-1">
                          ${Number(product.price).toLocaleString()}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}

              {/* Show remaining count */}
              {hasMore && !searchQuery && (
                <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/20 flex items-center justify-center">
                  <p className="text-sm text-zinc-500">
                    +{filteredProducts.length - 6} more — use search to find
                  </p>
                </div>
              )}

              {/* Add New Product card */}
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="p-4 rounded-xl border-2 border-dashed border-zinc-700 hover:border-cyan-500/40 transition-all text-left flex flex-col items-center justify-center gap-2 min-h-[100px] bg-zinc-900/20 hover:bg-cyan-500/5"
              >
                <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-cyan-400" />
                </div>
                <span className="text-sm font-medium text-cyan-400">Add New Product</span>
                <span className="text-xs text-zinc-500">Create a product for this campaign</span>
              </button>

              {/* No results */}
              {searchQuery && filteredProducts.length === 0 && (
                <div className="col-span-2 p-6 text-center">
                  <Search className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                  <p className="text-zinc-400">No products match "{searchQuery}"</p>
                  <p className="text-xs text-zinc-500 mt-1">Try a different search or add a new product</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Add Product Form */}
        {!productsLoading && showAddForm && (
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                Add New Product
              </h3>
              <button type="button" onClick={() => setShowAddForm(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-zinc-300">Product Name *</Label>
                <Input
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  placeholder="e.g., ISYNCSO Platform"
                  className="mt-1.5 bg-zinc-900/50 border-zinc-700"
                />
              </div>
              <div>
                <Label className="text-zinc-300">Type *</Label>
                <Select value={newProduct.type} onValueChange={(v) => setNewProduct({ ...newProduct, type: v })}>
                  <SelectTrigger className="mt-1.5 bg-zinc-900/50 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-zinc-300">Description *</Label>
              <Textarea
                value={newProduct.description}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                placeholder="What does your product do? What value does it provide?"
                className="mt-1.5 bg-zinc-900/50 border-zinc-700 min-h-[80px]"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-zinc-300">Short Description</Label>
                <Input
                  value={newProduct.short_description}
                  onChange={(e) => setNewProduct({ ...newProduct, short_description: e.target.value })}
                  placeholder="One-liner summary"
                  className="mt-1.5 bg-zinc-900/50 border-zinc-700"
                />
              </div>
              <div>
                <Label className="text-zinc-300">Price</Label>
                <Input
                  type="number"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                  placeholder="0.00"
                  className="mt-1.5 bg-zinc-900/50 border-zinc-700"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setShowAddForm(false)} className="text-zinc-400">
                Cancel
              </Button>
              <Button
                onClick={handleCreateProduct}
                disabled={saving || !newProduct.name.trim() || !newProduct.description.trim()}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Creating...</> : <><Plus className="w-4 h-4 mr-2" /> Create & Select</>}
              </Button>
            </div>
          </div>
        )}

        {/* Selected product summary */}
        {!productsLoading && hasSelectedProduct && !showAddForm && (
          <div className="mt-4 p-3 rounded-lg bg-zinc-900/50 border border-zinc-700">
            <p className="text-xs text-zinc-500 mb-1">Product description (will be used for personalization)</p>
            <p className="text-sm text-zinc-300">{formData.productDescription || 'No description available.'}</p>
          </div>
        )}
      </div>

      {/* Price Range & Sales Cycle */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label className="text-zinc-300">Price Range</Label>
          <Select
            value={formData.priceRange}
            onValueChange={(value) => setFormData({ ...formData, priceRange: value })}
          >
            <SelectTrigger className="mt-1.5 bg-zinc-900/50 border-zinc-700">
              <SelectValue placeholder="Select price range" />
            </SelectTrigger>
            <SelectContent>
              {PRICE_RANGES.map((range) => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-zinc-300">Sales Cycle</Label>
          <Select
            value={formData.salesCycle}
            onValueChange={(value) => setFormData({ ...formData, salesCycle: value })}
          >
            <SelectTrigger className="mt-1.5 bg-zinc-900/50 border-zinc-700">
              <SelectValue placeholder="Select sales cycle" />
            </SelectTrigger>
            <SelectContent>
              {SALES_CYCLES.map((cycle) => (
                <SelectItem key={cycle.value} value={cycle.value}>
                  {cycle.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

// AI prefill banner
function AIPrefillBanner() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 mb-4">
      <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0" />
      <p className="text-xs text-cyan-300">
        AI pre-filled these fields based on your product. Review and adjust as needed.
      </p>
    </div>
  );
}

// Step 2: Target Audience (ICP)
function Step2ICP({ formData, setFormData }) {
  return (
    <div className="space-y-6">
      {formData._aiAnalyzed && <AIPrefillBanner />}
      {/* Company Criteria */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Building2 className="w-5 h-5 text-indigo-400" />
          Company Criteria
        </h3>

        <div>
          <Label className="text-zinc-300 mb-2 block">Industries</Label>
          <ChipSelect
            options={INDUSTRIES}
            selected={formData.industries}
            onChange={(industries) => setFormData({ ...formData, industries })}
          />
        </div>

        <div>
          <Label className="text-zinc-300 mb-2 block">Company Size (Employees)</Label>
          <ChipSelect
            options={COMPANY_SIZES}
            selected={formData.companySizes}
            onChange={(companySizes) => setFormData({ ...formData, companySizes })}
            renderLabel={(opt) => opt.label}
          />
        </div>

        <div>
          <Label className="text-zinc-300 mb-2 block">Revenue Range</Label>
          <ChipSelect
            options={REVENUE_RANGES}
            selected={formData.revenueRanges}
            onChange={(revenueRanges) => setFormData({ ...formData, revenueRanges })}
            renderLabel={(opt) => opt.label}
          />
        </div>

        <div>
          <Label className="text-zinc-300 mb-2 block">Regions</Label>
          <ChipSelect
            options={REGIONS}
            selected={formData.regions}
            onChange={(regions) => setFormData({ ...formData, regions })}
            renderLabel={(opt) => opt.label}
          />
        </div>
      </div>

      {/* Contact Criteria */}
      <div className="space-y-4 pt-4 border-t border-zinc-800">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-indigo-400" />
          Contact Criteria
        </h3>

        <div>
          <Label className="text-zinc-300 mb-2 block">Job Titles</Label>
          <TagInput
            tags={formData.jobTitles}
            onChange={(jobTitles) => setFormData({ ...formData, jobTitles })}
            placeholder='e.g., "VP Sales", "CTO", "Head of Growth"'
          />
        </div>

        <div>
          <Label className="text-zinc-300 mb-2 block">Seniority Levels</Label>
          <ChipSelect
            options={SENIORITY_LEVELS}
            selected={formData.seniorityLevels}
            onChange={(seniorityLevels) => setFormData({ ...formData, seniorityLevels })}
            renderLabel={(opt) => opt.label}
          />
        </div>

        <div>
          <Label className="text-zinc-300 mb-2 block">Departments</Label>
          <ChipSelect
            options={DEPARTMENTS}
            selected={formData.departments}
            onChange={(departments) => setFormData({ ...formData, departments })}
          />
        </div>
      </div>
    </div>
  );
}

// Step 3: Campaign Goals
function Step3Goals({ formData, setFormData }) {
  // Auto-calculate target meetings when prospect count or response rate changes
  useEffect(() => {
    const targetMeetings = Math.round(
      (formData.prospectCount * formData.targetResponseRate) / 100
    );
    setFormData((prev) => ({ ...prev, targetMeetings }));
  }, [formData.prospectCount, formData.targetResponseRate]);

  return (
    <div className="space-y-6">
      {formData._aiAnalyzed && <AIPrefillBanner />}
      {/* Primary Goal */}
      <div>
        <Label className="text-zinc-300 mb-3 block">Primary Goal *</Label>
        <div className="grid md:grid-cols-2 gap-3">
          {CAMPAIGN_GOALS.map((goal) => {
            const GoalIcon = goal.icon;
            const isSelected = formData.primaryGoal === goal.value;

            return (
              <button
                key={goal.value}
                type="button"
                onClick={() => setFormData({ ...formData, primaryGoal: goal.value })}
                className={`p-4 rounded-xl border transition-all text-left ${
                  isSelected
                    ? 'bg-indigo-500/10 border-indigo-500/50 text-white'
                    : 'bg-zinc-900/30 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                <GoalIcon
                  className={`w-5 h-5 mb-2 ${isSelected ? 'text-indigo-400' : ''}`}
                />
                <span className="text-sm font-medium">{goal.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Target Metrics */}
      <div className="space-y-4 pt-4 border-t border-zinc-800">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Target className="w-5 h-5 text-indigo-400" />
          Target Metrics
        </h3>

        <div>
          <Label className="text-zinc-300 mb-2 block">
            How many prospects to reach?
          </Label>
          <Input
            type="number"
            value={formData.prospectCount}
            onChange={(e) =>
              setFormData({
                ...formData,
                prospectCount: parseInt(e.target.value) || 0,
              })
            }
            min={10}
            max={10000}
            className="bg-zinc-900/50 border-zinc-700 w-40"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-zinc-300">Target Response Rate</Label>
            <span className="text-indigo-400 font-medium">
              {formData.targetResponseRate}%
            </span>
          </div>
          <Slider
            value={[formData.targetResponseRate]}
            onValueChange={([value]) =>
              setFormData({ ...formData, targetResponseRate: value })
            }
            min={5}
            max={30}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-zinc-500 mt-1">
            <span>5%</span>
            <span>30%</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
          <div className="flex items-center gap-2 text-indigo-400">
            <Calendar className="w-5 h-5" />
            <span className="font-medium">Estimated Meetings</span>
          </div>
          <p className="text-2xl font-bold text-white mt-1">
            {formData.targetMeetings}
          </p>
          <p className="text-sm text-zinc-400">
            Based on {formData.prospectCount} prospects at {formData.targetResponseRate}%
            response rate
          </p>
        </div>
      </div>

      {/* Outreach Channels */}
      <div className="space-y-4 pt-4 border-t border-zinc-800">
        <h3 className="text-lg font-semibold text-white">Outreach Channels</h3>

        <div className="space-y-3">
          {[
            { id: 'email', label: 'Email', icon: Mail },
            { id: 'linkedin', label: 'LinkedIn', icon: Linkedin },
            { id: 'phone', label: 'Phone/SMS', icon: Phone },
          ].map((channel) => {
            const ChannelIcon = channel.icon;
            return (
              <label
                key={channel.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900/30 border border-zinc-700 cursor-pointer hover:border-zinc-600 transition-all"
              >
                <Checkbox
                  checked={formData.channels[channel.id]}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      channels: { ...formData.channels, [channel.id]: checked },
                    })
                  }
                />
                <ChannelIcon className="w-5 h-5 text-zinc-400" />
                <span className="text-white">{channel.label}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Step 4: Correlation Insights
function Step4Correlations({ formData, setFormData, analyzing }) {
  const addCustomQuestion = () => {
    setFormData({
      ...formData,
      customQuestions: [...formData.customQuestions, ''],
    });
  };

  const updateCustomQuestion = (index, value) => {
    const updated = [...formData.customQuestions];
    updated[index] = value;
    setFormData({ ...formData, customQuestions: updated });
  };

  const removeCustomQuestion = (index) => {
    if (formData.customQuestions.length > 1) {
      const updated = formData.customQuestions.filter((_, i) => i !== index);
      setFormData({ ...formData, customQuestions: updated });
    }
  };

  return (
    <div className="space-y-6">
      {formData._aiAnalyzed && <AIPrefillBanner />}
      <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-indigo-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-white">AI-Powered Research</h4>
            <p className="text-sm text-zinc-400 mt-1">
              Our AI will research each prospect to find these signals and correlations,
              enabling hyper-personalized outreach.
            </p>
          </div>
        </div>
      </div>

      {/* Buying Signals */}
      <div>
        <Label className="text-zinc-300 mb-3 block">Buying Signals to Watch For</Label>
        <div className="grid md:grid-cols-2 gap-3">
          {BUYING_SIGNALS.map((signal) => {
            const SignalIcon = signal.icon;
            const isSelected = formData.buyingSignals.includes(signal.id);

            return (
              <button
                key={signal.id}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    setFormData({
                      ...formData,
                      buyingSignals: formData.buyingSignals.filter(
                        (s) => s !== signal.id
                      ),
                    });
                  } else {
                    setFormData({
                      ...formData,
                      buyingSignals: [...formData.buyingSignals, signal.id],
                    });
                  }
                }}
                className={`p-3 rounded-xl border transition-all text-left flex items-center gap-3 ${
                  isSelected
                    ? 'bg-indigo-500/10 border-indigo-500/50'
                    : 'bg-zinc-900/30 border-zinc-700 hover:border-zinc-600'
                }`}
              >
                <SignalIcon
                  className={`w-5 h-5 ${
                    isSelected ? 'text-indigo-400' : 'text-zinc-500'
                  }`}
                />
                <span className={isSelected ? 'text-white' : 'text-zinc-400'}>
                  {signal.label}
                </span>
                {isSelected && <Check className="w-4 h-4 text-indigo-400 ml-auto" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Correlation Questions */}
      <div className="pt-4 border-t border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <Label className="text-zinc-300 flex items-center gap-2">
            Custom Research Questions
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-4 h-4 text-zinc-500" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    AI will research answers to these questions for each prospect. Use
                    these for unique correlations relevant to your business.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addCustomQuestion}
            className="text-indigo-400 hover:text-indigo-300"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Question
          </Button>
        </div>

        <div className="space-y-3">
          {formData.customQuestions.map((question, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={question}
                onChange={(e) => updateCustomQuestion(index, e.target.value)}
                placeholder={`e.g., "Does this company use [competitor]?"`}
                className="bg-zinc-900/50 border-zinc-700"
              />
              {formData.customQuestions.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCustomQuestion(index)}
                  className="text-zinc-500 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Personalization Angles */}
      <div className="pt-4 border-t border-zinc-800">
        <h3 className="text-lg font-semibold text-white mb-4">Personalization Context</h3>

        <div className="space-y-4">
          <div>
            <Label htmlFor="personalizationAngles" className="text-zinc-300">
              What aspects of their business relate to your solution?
            </Label>
            <Textarea
              id="personalizationAngles"
              value={formData.personalizationAngles}
              onChange={(e) =>
                setFormData({ ...formData, personalizationAngles: e.target.value })
              }
              placeholder="e.g., If they're scaling their sales team, our tool helps with onboarding..."
              className="mt-1.5 bg-zinc-900/50 border-zinc-700"
            />
          </div>

          <div>
            <Label htmlFor="triggerIndicators" className="text-zinc-300">
              Any specific triggers that indicate need?
            </Label>
            <Textarea
              id="triggerIndicators"
              value={formData.triggerIndicators}
              onChange={(e) =>
                setFormData({ ...formData, triggerIndicators: e.target.value })
              }
              placeholder="e.g., Companies hiring for RevOps roles, mentions of CRM migration..."
              className="mt-1.5 bg-zinc-900/50 border-zinc-700"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 5: Review & Launch
function Step5Review({ formData, setFormData, nests = [] }) {
  const estimatedCredits = Math.round(
    formData.prospectCount * ENRICHMENT_COST_PER_PROSPECT
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Product Summary */}
        <GlassCard className="p-4">
          <h4 className="text-sm font-medium text-zinc-400 mb-2 flex items-center gap-2">
            <Package className="w-4 h-4" />
            Product/Service
          </h4>
          <p className="text-white font-medium">{formData.campaignName || 'Untitled'}</p>
          <p className="text-sm text-zinc-400 mt-1 line-clamp-2">
            {formData.productDescription || 'No description'}
          </p>
          {formData.priceRange && (
            <Badge className="mt-2 bg-zinc-800 text-zinc-300">
              {PRICE_RANGES.find((p) => p.value === formData.priceRange)?.label}
            </Badge>
          )}
        </GlassCard>

        {/* Audience Summary */}
        <GlassCard className="p-4">
          <h4 className="text-sm font-medium text-zinc-400 mb-2 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Target Audience
          </h4>
          <div className="space-y-1">
            {formData.industries.length > 0 && (
              <p className="text-sm text-zinc-300">
                <span className="text-zinc-500">Industries:</span>{' '}
                {formData.industries.slice(0, 3).join(', ')}
                {formData.industries.length > 3 &&
                  ` +${formData.industries.length - 3}`}
              </p>
            )}
            {formData.jobTitles.length > 0 && (
              <p className="text-sm text-zinc-300">
                <span className="text-zinc-500">Titles:</span>{' '}
                {formData.jobTitles.slice(0, 2).join(', ')}
                {formData.jobTitles.length > 2 && ` +${formData.jobTitles.length - 2}`}
              </p>
            )}
            {formData.companySizes.length > 0 && (
              <p className="text-sm text-zinc-300">
                <span className="text-zinc-500">Size:</span>{' '}
                {formData.companySizes.join(', ')}
              </p>
            )}
          </div>
        </GlassCard>

        {/* Goals Summary */}
        <GlassCard className="p-4">
          <h4 className="text-sm font-medium text-zinc-400 mb-2 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Campaign Goals
          </h4>
          <p className="text-white font-medium">
            {CAMPAIGN_GOALS.find((g) => g.value === formData.primaryGoal)?.label ||
              'Not set'}
          </p>
          <div className="flex gap-4 mt-2 text-sm">
            <span className="text-zinc-400">
              <span className="text-white font-medium">{formData.prospectCount}</span>{' '}
              prospects
            </span>
            <span className="text-zinc-400">
              <span className="text-white font-medium">{formData.targetMeetings}</span>{' '}
              target meetings
            </span>
          </div>
          <div className="flex gap-2 mt-2">
            {formData.channels.email && (
              <Badge className="bg-zinc-800 text-zinc-300">
                <Mail className="w-3 h-3 mr-1" /> Email
              </Badge>
            )}
            {formData.channels.linkedin && (
              <Badge className="bg-zinc-800 text-zinc-300">
                <Linkedin className="w-3 h-3 mr-1" /> LinkedIn
              </Badge>
            )}
            {formData.channels.phone && (
              <Badge className="bg-zinc-800 text-zinc-300">
                <Phone className="w-3 h-3 mr-1" /> Phone
              </Badge>
            )}
          </div>
        </GlassCard>

        {/* Signals Summary */}
        <GlassCard className="p-4">
          <h4 className="text-sm font-medium text-zinc-400 mb-2 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Buying Signals
          </h4>
          {formData.buyingSignals.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {formData.buyingSignals.map((signal) => (
                <Badge key={signal} className="bg-indigo-500/20 text-indigo-400">
                  {BUYING_SIGNALS.find((s) => s.id === signal)?.label}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No signals selected</p>
          )}
          {formData.customQuestions.filter(Boolean).length > 0 && (
            <p className="text-xs text-zinc-500 mt-2">
              +{formData.customQuestions.filter(Boolean).length} custom questions
            </p>
          )}
        </GlassCard>
      </div>

      {/* Credits Estimate */}
      <GlassCard className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-white font-medium">Estimated Credits Needed</h4>
            <p className="text-sm text-zinc-400">
              {formData.prospectCount} prospects × {ENRICHMENT_COST_PER_PROSPECT} credits
              each
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-indigo-400">{estimatedCredits}</p>
            <p className="text-xs text-zinc-500">credits</p>
          </div>
        </div>
      </GlassCard>

      {/* Data Source Selection */}
      <div>
        <Label className="text-zinc-300 mb-3 block">Data Source *</Label>
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, dataSource: 'find_new' })}
            className={`w-full p-4 rounded-xl border transition-all text-left flex items-center gap-4 ${
              formData.dataSource === 'find_new'
                ? 'bg-indigo-500/10 border-indigo-500/50'
                : 'bg-zinc-900/30 border-zinc-700 hover:border-zinc-600'
            }`}
          >
            <div
              className={`p-2 rounded-lg ${
                formData.dataSource === 'find_new'
                  ? 'bg-indigo-500/20'
                  : 'bg-zinc-800'
              }`}
            >
              <Search
                className={`w-5 h-5 ${
                  formData.dataSource === 'find_new'
                    ? 'text-indigo-400'
                    : 'text-zinc-500'
                }`}
              />
            </div>
            <div>
              <p className="font-medium text-white">Find new prospects</p>
              <p className="text-sm text-zinc-400">
                Browse our Nest marketplace for targeted leads
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setFormData({ ...formData, dataSource: 'existing_nest' })}
            className={`w-full p-4 rounded-xl border transition-all text-left flex items-center gap-4 ${
              formData.dataSource === 'existing_nest'
                ? 'bg-indigo-500/10 border-indigo-500/50'
                : 'bg-zinc-900/30 border-zinc-700 hover:border-zinc-600'
            }`}
          >
            <div
              className={`p-2 rounded-lg ${
                formData.dataSource === 'existing_nest'
                  ? 'bg-indigo-500/20'
                  : 'bg-zinc-800'
              }`}
            >
              <Database
                className={`w-5 h-5 ${
                  formData.dataSource === 'existing_nest'
                    ? 'text-indigo-400'
                    : 'text-zinc-500'
                }`}
              />
            </div>
            <div className="flex-1">
              <p className="font-medium text-white">Use existing Nest</p>
              <p className="text-sm text-zinc-400">
                Select from your purchased prospect lists
              </p>
            </div>
          </button>

          {formData.dataSource === 'existing_nest' && (
            <div className="pl-14">
              <Select
                value={formData.selectedNestId}
                onValueChange={(value) =>
                  setFormData({ ...formData, selectedNestId: value })
                }
              >
                <SelectTrigger className="bg-zinc-900/50 border-zinc-700">
                  <SelectValue placeholder="Select a Nest" />
                </SelectTrigger>
                <SelectContent>
                  {nests.length > 0 ? (
                    nests.map((nest) => (
                      <SelectItem key={nest.id} value={nest.id}>
                        {nest.name} ({nest.lead_count?.toLocaleString() || 0} leads)
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>
                      No nests available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <button
            type="button"
            onClick={() => setFormData({ ...formData, dataSource: 'upload_csv' })}
            className={`w-full p-4 rounded-xl border transition-all text-left flex items-center gap-4 ${
              formData.dataSource === 'upload_csv'
                ? 'bg-indigo-500/10 border-indigo-500/50'
                : 'bg-zinc-900/30 border-zinc-700 hover:border-zinc-600'
            }`}
          >
            <div
              className={`p-2 rounded-lg ${
                formData.dataSource === 'upload_csv'
                  ? 'bg-indigo-500/20'
                  : 'bg-zinc-800'
              }`}
            >
              <Upload
                className={`w-5 h-5 ${
                  formData.dataSource === 'upload_csv'
                    ? 'text-indigo-400'
                    : 'text-zinc-500'
                }`}
              />
            </div>
            <div>
              <p className="font-medium text-white">Upload CSV</p>
              <p className="text-sm text-zinc-400">Import your own prospect list</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// Main component
export default function GrowthCampaignWizard() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [formData, setFormData] = useState(getInitialState);
  const [saving, setSaving] = useState(false);
  const [nests, setNests] = useState([]);
  const [nestsLoading, setNestsLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const orgId = user?.organization_id || user?.company_id;

  // Fetch available nests
  useEffect(() => {
    async function fetchNests() {
      if (!orgId) return;

      setNestsLoading(true);
      try {
        // Fetch from growth_nests marketplace (shared nests available for purchase)
        const { data, error } = await supabase
          .from('growth_nests')
          .select('id, name, lead_count, industry, region, price_credits')
          .eq('is_active', true)
          .order('is_featured', { ascending: false });

        if (!error && data) {
          setNests(data.map(n => ({
            id: n.id,
            name: n.name,
            lead_count: n.lead_count || 0,
            industry: n.industry,
            region: n.region,
            price_credits: n.price_credits,
          })));
        }
      } catch (error) {
        console.error('Error fetching nests:', error);
      } finally {
        setNestsLoading(false);
      }
    }

    fetchNests();
  }, [orgId]);

  // Fetch available products (use company_id which is what products table uses)
  const companyId = user?.company_id;
  useEffect(() => {
    async function fetchProducts() {
      if (!companyId) return;
      setProductsLoading(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, type, description, short_description, price, featured_image, status, tagline, category')
          .eq('company_id', companyId)
          .order('updated_at', { ascending: false });
        if (error) {
          console.error('Error fetching products:', error);
        } else if (data) {
          setProducts(data);
        }
      } catch (e) {
        console.error('Error fetching products:', e);
      } finally {
        setProductsLoading(false);
      }
    }
    fetchProducts();
  }, [companyId]);

  // Load draft from localStorage on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(STORAGE_KEY);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        setFormData(parsed);
      } catch (e) {
        console.error('Failed to parse campaign draft:', e);
      }
    }
  }, []);

  // Save to localStorage on form changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
  }, [formData]);

  // AI product analysis - fills in remaining wizard steps
  const analyzeProduct = useCallback(async () => {
    if (!formData.selectedProduct) return;
    setAnalyzing(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-product-campaign`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            product: formData.selectedProduct,
            productDescription: formData.productDescription,
            problemSolved: formData.problemSolved,
          }),
        }
      );
      const data = await response.json();
      if (data && !data.error) {
        // Merge AI suggestions — only fill fields that are still at their defaults
        setFormData((prev) => ({
          ...prev,
          // Step 1 fields
          priceRange: prev.priceRange || data.priceRange || '',
          salesCycle: prev.salesCycle || data.salesCycle || '',
          // Step 2: ICP — only fill if user hasn't already selected
          industries: prev.industries.length > 0 ? prev.industries : (data.industries || []),
          companySizes: prev.companySizes.length > 0 ? prev.companySizes : (data.companySizes || []),
          revenueRanges: prev.revenueRanges.length > 0 ? prev.revenueRanges : (data.revenueRanges || []),
          regions: prev.regions.length > 0 ? prev.regions : (data.regions || []),
          jobTitles: prev.jobTitles.length > 0 ? prev.jobTitles : (data.jobTitles || []),
          seniorityLevels: prev.seniorityLevels.length > 0 ? prev.seniorityLevels : (data.seniorityLevels || []),
          departments: prev.departments.length > 0 ? prev.departments : (data.departments || []),
          // Step 3: Goals
          primaryGoal: prev.primaryGoal || data.primaryGoal || '',
          prospectCount: prev.prospectCount !== 100 ? prev.prospectCount : (data.prospectCount || 100),
          channels: (prev.channels.linkedin || prev.channels.phone)
            ? prev.channels
            : (data.channels || prev.channels),
          // Step 4: Correlations
          buyingSignals: prev.buyingSignals.length > 0 ? prev.buyingSignals : (data.buyingSignals || []),
          personalizationAngles: prev.personalizationAngles || data.personalizationAngles || '',
          triggerIndicators: prev.triggerIndicators || data.triggerIndicators || '',
          customQuestions: prev.customQuestions.some(q => q.trim())
            ? prev.customQuestions
            : (data.customQuestions?.length > 0 ? data.customQuestions : prev.customQuestions),
          _aiAnalyzed: true,
        }));
        toast.success('AI analyzed your product and pre-filled campaign settings');
      }
    } catch (e) {
      console.error('AI product analysis failed:', e);
      // Non-blocking — user can fill manually
    } finally {
      setAnalyzing(false);
    }
  }, [formData.selectedProduct, formData.productDescription, formData.problemSolved]);

  // Navigation
  const goNext = async () => {
    if (currentStep < STEPS.length) {
      // Trigger AI analysis when leaving Step 1 with a selected product
      if (currentStep === 1 && formData.selectedProduct && !formData._aiAnalyzed) {
        await analyzeProduct();
      }
      setDirection(1);
      setCurrentStep(currentStep + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      setDirection(-1);
      setCurrentStep(currentStep - 1);
    }
  };

  // Validation
  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.campaignName && formData.productId;
      case 2:
        return formData.industries.length > 0 || formData.jobTitles.length > 0;
      case 3:
        return formData.primaryGoal && Object.values(formData.channels).some(Boolean);
      case 4:
        return true; // Optional step
      case 5:
        return formData.dataSource !== '';
      default:
        return false;
    }
  };

  // Save draft to database
  const saveDraft = useCallback(async () => {
    if (!user?.id) return;

    setSaving(true);
    try {
      const campaignData = {
        organization_id: orgId,
        name: formData.campaignName || 'Untitled Campaign',
        description: formData.productDescription || null,
        status: 'draft',
        campaign_type: 'new_business',
        target_audience: {
          industries: formData.industries || [],
          company_sizes: formData.companySizes || [],
          job_titles: formData.jobTitles || [],
          regions: formData.regions || [],
          revenue_range: formData.revenueRange || null,
        },
        campaign_goals: {
          primary_goal: formData.primaryGoal || null,
          target_meetings: formData.targetMeetings || 0,
          target_responses: formData.targetResponses || 0,
          channels: formData.channels || {},
          price_range: formData.priceRange || null,
          sales_cycle: formData.salesCycle || null,
        },
        role_context: {
          product_description: formData.productDescription || null,
          problem_solved: formData.problemSolved || null,
          ideal_customer: formData.idealCustomer || null,
          buying_signals: formData.buyingSignals || [],
          research_questions: formData.researchQuestions || [],
          personalization_context: formData.personalizationContext || null,
          data_source: formData.dataSource || null,
          selected_nest_id: formData.selectedNestId || null,
          product: formData.selectedProduct ? {
            id: formData.selectedProduct.id,
            name: formData.selectedProduct.name,
            type: formData.selectedProduct.type,
            description: formData.selectedProduct.description,
            short_description: formData.selectedProduct.short_description,
            tagline: formData.selectedProduct.tagline,
            features: formData.selectedProduct.features,
            category: formData.selectedProduct.category,
            price: formData.selectedProduct.price,
            ...(formData.selectedProduct.digitalDetails ? {
              pricing_model: formData.selectedProduct.digitalDetails.pricing_model,
              digital_features: formData.selectedProduct.digitalDetails.features,
              trial_available: formData.selectedProduct.digitalDetails.trial_available,
              trial_days: formData.selectedProduct.digitalDetails.trial_days,
              demo_url: formData.selectedProduct.digitalDetails.demo_url,
              integrations: formData.selectedProduct.digitalDetails.integrations,
              ai_context: formData.selectedProduct.digitalDetails.ai_context,
            } : {}),
          } : null,
        },
        created_by: user.id,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('growth_campaigns')
        .upsert(campaignData, { onConflict: 'id' });

      if (error) throw error;

      toast.success('Draft saved');
    } catch (error) {
      console.error('Failed to save draft:', error);
      toast.error('Failed to save draft');
    } finally {
      setSaving(false);
    }
  }, [formData, user, orgId]);

  // Save and continue
  const handleContinue = async () => {
    if (!user?.id) return;

    setSaving(true);
    try {
      const campaignData = {
        organization_id: orgId,
        name: formData.campaignName || 'Untitled Campaign',
        description: formData.productDescription || null,
        status: formData.dataSource === 'existing_data' ? 'active' : 'draft',
        campaign_type: 'new_business',
        product_id: formData.productId || null,
        journey_phase: 'nests',
        target_audience: {
          industries: formData.industries || [],
          company_sizes: formData.companySizes || [],
          job_titles: formData.jobTitles || [],
          regions: formData.regions || [],
          revenue_range: formData.revenueRange || null,
        },
        campaign_goals: {
          primary_goal: formData.primaryGoal || null,
          target_meetings: formData.targetMeetings || 0,
          target_responses: formData.targetResponses || 0,
          channels: formData.channels || {},
          price_range: formData.priceRange || null,
          sales_cycle: formData.salesCycle || null,
        },
        role_context: {
          product_description: formData.productDescription || null,
          problem_solved: formData.problemSolved || null,
          ideal_customer: formData.idealCustomer || null,
          buying_signals: formData.buyingSignals || [],
          research_questions: formData.researchQuestions || [],
          personalization_context: formData.personalizationContext || null,
          data_source: formData.dataSource || null,
          selected_nest_id: formData.selectedNestId || null,
          product: formData.selectedProduct ? {
            id: formData.selectedProduct.id,
            name: formData.selectedProduct.name,
            type: formData.selectedProduct.type,
            description: formData.selectedProduct.description,
            short_description: formData.selectedProduct.short_description,
            tagline: formData.selectedProduct.tagline,
            features: formData.selectedProduct.features,
            category: formData.selectedProduct.category,
            price: formData.selectedProduct.price,
            ...(formData.selectedProduct.digitalDetails ? {
              pricing_model: formData.selectedProduct.digitalDetails.pricing_model,
              digital_features: formData.selectedProduct.digitalDetails.features,
              trial_available: formData.selectedProduct.digitalDetails.trial_available,
              trial_days: formData.selectedProduct.digitalDetails.trial_days,
              demo_url: formData.selectedProduct.digitalDetails.demo_url,
              integrations: formData.selectedProduct.digitalDetails.integrations,
              ai_context: formData.selectedProduct.digitalDetails.ai_context,
            } : {}),
          } : null,
        },
        created_by: user.id,
      };

      const { data, error } = await supabase
        .from('growth_campaigns')
        .insert(campaignData)
        .select()
        .single();

      if (error) throw error;

      localStorage.removeItem(STORAGE_KEY);
      navigate(`/growth/campaign/${data.id}/nests`);
      toast.success('Campaign saved! Choose your prospects.');
    } catch (error) {
      console.error('Failed to save campaign:', error);
      toast.error('Failed to save campaign');
    } finally {
      setSaving(false);
    }
  };

  // Save and exit
  const handleSaveAndExit = async () => {
    await saveDraft();
    navigate('/GrowthDashboard');
  };

  // Render current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <Step1Product formData={formData} setFormData={setFormData} products={products} productsLoading={productsLoading} onProductCreated={(p) => setProducts(prev => [p, ...prev])} />;
      case 2:
        return <Step2ICP formData={formData} setFormData={setFormData} />;
      case 3:
        return <Step3Goals formData={formData} setFormData={setFormData} />;
      case 4:
        return <Step4Correlations formData={formData} setFormData={setFormData} />;
      case 5:
        return <Step5Review formData={formData} setFormData={setFormData} nests={nests} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="w-full px-6 lg:px-8 xl:px-12 max-w-[1800px] mx-auto py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/GrowthDashboard')}
              className="text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">New Campaign</h1>
              <p className="text-zinc-400 text-sm">
                {STEPS[currentStep - 1].description}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={handleSaveAndExit}
            disabled={saving}
            className="text-zinc-400 hover:text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            Save & Exit
          </Button>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <ProgressIndicator currentStep={currentStep} steps={STEPS} />
        </div>

        {/* Content */}
        <GlassCard className="p-6 mb-6 overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </GlassCard>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={goBack}
            disabled={currentStep === 1}
            className="border-zinc-700 text-zinc-300"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="flex gap-3">
            {currentStep === STEPS.length ? (
              <>
                <Button
                  variant="outline"
                  onClick={saveDraft}
                  disabled={saving}
                  className="border-zinc-700 text-zinc-300"
                >
                  Save as Draft
                </Button>
                <Button
                  onClick={handleContinue}
                  disabled={!isStepValid() || saving}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  {saving ? 'Saving...' : 'Continue to Prospect Selection'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </>
            ) : (
              <Button
                onClick={goNext}
                disabled={!isStepValid() || analyzing}
                className="bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing product...
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
