import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wand2,
  ArrowLeft,
  ArrowRight,
  Check,
  Search,
  Package,
  Monitor,
  Settings2,
  Sparkles,
  Loader2,
  RefreshCw,
  Save,
  CheckCircle2,
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
  Globe,
  Music2,
  Image,
  Video,
  Type,
  Layers,
  Target,
  Eye,
  RotateCcw,
  Users,
  AlertCircle,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { createPageUrl } from "@/utils";
import { Button, MotionButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  PLATFORMS,
  PLATFORM_GROUPS,
  AD_TYPES,
  CAMPAIGN_GOALS,
  TONE_OPTIONS,
  VARIANT_STATUSES,
} from "@/lib/reach-constants";
import { CreditCostBadge } from '@/components/credits/CreditCostBadge';

// ---------------------------------------------------------------------------
// Icon maps
// ---------------------------------------------------------------------------

const PLATFORM_ICONS = {
  Instagram: Instagram,
  Facebook: Facebook,
  Linkedin: Linkedin,
  Youtube: Youtube,
  Globe: Globe,
  Search: Search,
  Music2: Music2,
};

const PLATFORM_GROUP_ICONS = {
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  tiktok: Music2,
  google: Globe,
  youtube: Youtube,
};

const AD_TYPE_ICONS = {
  single_image: Image,
  carousel: Layers,
  video: Video,
  story_reel: Video,
  text_image: Type,
};

const GOAL_ICONS = {
  awareness: Eye,
  traffic: Globe,
  conversions: Target,
  retargeting: RotateCcw,
};

// ---------------------------------------------------------------------------
// Steps definition
// ---------------------------------------------------------------------------

const STEPS = [
  { key: "product", label: "Product", icon: Package },
  { key: "platforms", label: "Platforms", icon: Monitor },
  { key: "config", label: "Configure", icon: Settings2 },
  { key: "generate", label: "Generate", icon: Sparkles },
];

// ---------------------------------------------------------------------------
// Stepper UI
// ---------------------------------------------------------------------------

function Stepper({ currentStep, steps }) {
  return (
    <div className="flex items-center gap-2 w-full">
      {steps.map((step, i) => {
        const StepIcon = step.icon;
        const isActive = i === currentStep;
        const isComplete = i < currentStep;
        return (
          <React.Fragment key={step.key}>
            {i > 0 && (
              <div
                className={`flex-1 h-px transition-colors duration-300 ${
                  isComplete ? "bg-cyan-500/50" : "bg-zinc-800"
                }`}
              />
            )}
            <div className="flex items-center gap-2 shrink-0">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                  isActive
                    ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-400"
                    : isComplete
                    ? "bg-cyan-600/20 border border-cyan-600/30 text-cyan-500"
                    : "bg-zinc-800/60 border border-zinc-700/40 text-zinc-500"
                }`}
              >
                {isComplete ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <StepIcon className="w-4 h-4" />
                )}
              </div>
              <span
                className={`text-sm font-medium hidden sm:inline transition-colors ${
                  isActive
                    ? "text-cyan-400"
                    : isComplete
                    ? "text-zinc-400"
                    : "text-zinc-600"
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
// Step 1: Select Product
// ---------------------------------------------------------------------------

function StepProduct({ selected, onSelect, additionalContext, onContextChange }) {
  const { user } = useUser();
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch all products once on mount (matches Growth pattern)
  useEffect(() => {
    async function fetchProducts() {
      if (!user?.company_id) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("products")
          .select("id, name, type, description, short_description, price, featured_image, status, tagline, category")
          .eq("company_id", user.company_id)
          .order("updated_at", { ascending: false });
        if (error) {
          console.error("Error fetching products:", error);
          toast.error("Failed to load products");
        } else {
          setProducts(data || []);
        }
      } catch (err) {
        console.error("Product fetch failed:", err);
        toast.error("Failed to load products");
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, [user?.company_id]);

  // Client-side search-as-you-type filtering (matches Growth pattern)
  const filteredProducts = useMemo(() => {
    if (!query.trim()) return products;
    const q = query.toLowerCase();
    return products.filter(
      (p) =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q) ||
        (p.tagline || "").toLowerCase().includes(q) ||
        (p.short_description || "").toLowerCase().includes(q) ||
        (p.type || "").toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q)
    );
  }, [products, query]);

  return (
    <div className="space-y-6">
      {/* Search-as-you-type input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <Input
          placeholder="Search products..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 bg-zinc-900/60 border-zinc-800 text-white placeholder:text-zinc-500"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <p className="text-xs text-zinc-500">
        {products.length} product{products.length !== 1 ? "s" : ""} available
        {query.trim() ? ` \u2014 ${filteredProducts.length} matching "${query}"` : " \u2014 start typing to filter"}
      </p>

      {/* Product list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
        </div>
      ) : !loading && products.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No products found</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No products match "{query}"</p>
          <p className="text-xs text-zinc-600 mt-1">Try a different search term</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-1">
          {filteredProducts.map((product) => {
            const isSelected = selected?.id === product.id;
            const imgSrc = typeof product.featured_image === "string"
              ? product.featured_image
              : product.featured_image?.url || null;
            return (
              <motion.button
                key={product.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => onSelect(product)}
                className={`text-left p-4 rounded-xl border transition-all duration-200 ${
                  isSelected
                    ? "border-cyan-500/50 bg-cyan-500/10"
                    : "border-zinc-800/60 bg-zinc-900/40 hover:border-zinc-700/60 hover:bg-zinc-900/60"
                }`}
              >
                <div className="flex items-start gap-3">
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={product.name}
                      className="w-12 h-12 rounded-lg object-cover shrink-0 bg-zinc-800"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-zinc-800/60 flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5 text-zinc-600" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white truncate">
                        {product.name}
                      </p>
                      {product.type && (
                        <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          {product.type}
                        </span>
                      )}
                    </div>
                    {(product.tagline || product.short_description) && (
                      <p className="text-xs text-zinc-400 truncate mt-0.5">
                        {product.tagline || product.short_description}
                      </p>
                    )}
                    {product.category && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800/60 text-zinc-400 border border-zinc-700/40">
                        {product.category}
                      </span>
                    )}
                    {product.price != null && (
                      <p className="text-xs text-zinc-500 mt-1">
                        EUR {Number(product.price).toFixed(2)}
                      </p>
                    )}
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Selected product card */}
      {selected && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4"
        >
          <div className="flex items-center gap-3">
            {selected.featured_image ? (
              <img
                src={selected.featured_image}
                alt={selected.name}
                className="w-16 h-16 rounded-xl object-cover bg-zinc-800"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-zinc-800/60 flex items-center justify-center">
                <Package className="w-6 h-6 text-zinc-500" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium">{selected.name}</p>
              {selected.description && (
                <p className="text-xs text-zinc-400 line-clamp-2 mt-1">
                  {selected.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1">
                {selected.category && (
                  <Badge variant="info" size="xs">
                    {selected.category}
                  </Badge>
                )}
                {selected.price != null && (
                  <span className="text-xs text-zinc-500">
                    EUR {Number(selected.price).toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Additional context */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">
          Additional Context{" "}
          <span className="text-zinc-600 font-normal">(optional)</span>
        </label>
        <Textarea
          placeholder="E.g., 'Summer sale - 30% off', 'New launch for Q2', promo angles..."
          value={additionalContext}
          onChange={(e) => onContextChange(e.target.value)}
          rows={3}
          className="bg-zinc-900/60 border-zinc-800 text-white placeholder:text-zinc-600 resize-none"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2: Platform & Placement
// ---------------------------------------------------------------------------

function StepPlatforms({ selectedPlacements, onToggle }) {
  return (
    <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
      {Object.entries(PLATFORM_GROUPS).map(([groupKey, group]) => {
        const GroupIcon = PLATFORM_GROUP_ICONS[groupKey] || Globe;
        const groupPlacements = group.placements;
        const allSelected = groupPlacements.every((p) =>
          selectedPlacements.includes(p)
        );
        const someSelected = groupPlacements.some((p) =>
          selectedPlacements.includes(p)
        );

        return (
          <div
            key={groupKey}
            className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 overflow-hidden"
          >
            {/* Group header */}
            <button
              onClick={() => {
                if (allSelected) {
                  groupPlacements.forEach((p) => onToggle(p, false));
                } else {
                  groupPlacements.forEach((p) => onToggle(p, true));
                }
              }}
              className="w-full flex items-center gap-3 p-4 hover:bg-zinc-800/30 transition-colors"
            >
              <GroupIcon className="w-5 h-5 text-zinc-400" />
              <span className="text-sm font-medium text-white flex-1 text-left">
                {group.label}
              </span>
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                  allSelected
                    ? "bg-cyan-500 border-cyan-500"
                    : someSelected
                    ? "border-cyan-500/50 bg-cyan-500/20"
                    : "border-zinc-600 bg-transparent"
                }`}
              >
                {(allSelected || someSelected) && (
                  <Check className="w-3 h-3 text-white" />
                )}
              </div>
            </button>

            {/* Placements */}
            <div className="px-4 pb-4 space-y-2">
              {groupPlacements.map((placementKey) => {
                const plat = PLATFORMS[placementKey];
                if (!plat) return null;
                const isSelected = selectedPlacements.includes(placementKey);
                const dims =
                  plat.width && plat.height
                    ? `${plat.width}x${plat.height}`
                    : plat.maxHeadline
                    ? `${plat.maxHeadline} char headline`
                    : "Text only";

                return (
                  <motion.button
                    key={placementKey}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onToggle(placementKey, !isSelected)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${
                      isSelected
                        ? "border-cyan-500/40 bg-cyan-500/10"
                        : "border-zinc-800/40 bg-zinc-900/30 hover:border-zinc-700/50"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? "bg-cyan-500 border-cyan-500"
                          : "border-zinc-600"
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <span className="text-sm text-zinc-300 flex-1 text-left">
                      {plat.name}
                    </span>
                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded-md ${
                        isSelected
                          ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/20"
                          : "bg-zinc-800/40 text-zinc-500 border border-zinc-700/30"
                      }`}
                    >
                      {dims}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3: Ad Configuration
// ---------------------------------------------------------------------------

function StepConfig({
  campaignName,
  onNameChange,
  adType,
  onAdTypeChange,
  campaignGoal,
  onGoalChange,
  targetAudience,
  onAudienceChange,
  tone,
  onToneChange,
}) {
  return (
    <div className="space-y-6 max-h-[480px] overflow-y-auto pr-1">
      {/* Campaign Name */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">
          Campaign Name <span className="text-red-400">*</span>
        </label>
        <Input
          placeholder="e.g., Summer Sale 2026 - Instagram"
          value={campaignName}
          onChange={(e) => onNameChange(e.target.value)}
          className="bg-zinc-900/60 border-zinc-800 text-white placeholder:text-zinc-600"
        />
      </div>

      {/* Ad Type */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">Ad Type</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {AD_TYPES.map((type) => {
            const TypeIcon = AD_TYPE_ICONS[type.value] || Image;
            const isSelected = adType === type.value;
            return (
              <motion.button
                key={type.value}
                whileTap={{ scale: 0.97 }}
                onClick={() => onAdTypeChange(type.value)}
                className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all text-left ${
                  isSelected
                    ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-400"
                    : "border-zinc-800/60 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700/60"
                }`}
              >
                <TypeIcon className="w-4 h-4 shrink-0" />
                <span className="text-sm font-medium">{type.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Campaign Goal */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">
          Campaign Goal
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {CAMPAIGN_GOALS.map((goal) => {
            const GoalIcon = GOAL_ICONS[goal.value] || Target;
            const isSelected = campaignGoal === goal.value;
            return (
              <motion.button
                key={goal.value}
                whileTap={{ scale: 0.97 }}
                onClick={() => onGoalChange(goal.value)}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
                  isSelected
                    ? "border-cyan-500/40 bg-cyan-500/10"
                    : "border-zinc-800/60 bg-zinc-900/40 hover:border-zinc-700/60"
                }`}
              >
                <GoalIcon
                  className={`w-4 h-4 shrink-0 mt-0.5 ${
                    isSelected ? "text-cyan-400" : "text-zinc-500"
                  }`}
                />
                <div>
                  <p
                    className={`text-sm font-medium ${
                      isSelected ? "text-cyan-400" : "text-zinc-300"
                    }`}
                  >
                    {goal.label}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {goal.description}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Target Audience */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">
          Target Audience
        </label>
        <Textarea
          placeholder="Describe your target audience: demographics, interests, pain points..."
          value={targetAudience}
          onChange={(e) => onAudienceChange(e.target.value)}
          rows={3}
          className="bg-zinc-900/60 border-zinc-800 text-white placeholder:text-zinc-600 resize-none"
        />
      </div>

      {/* Tone */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">
          Tone of Voice
        </label>
        <div className="flex flex-wrap gap-2">
          {TONE_OPTIONS.map((t) => {
            const isSelected = tone === t.value;
            return (
              <button
                key={t.value}
                onClick={() => onToneChange(t.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                  isSelected
                    ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-400"
                    : "border-zinc-800/60 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700/60"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4: Generate & Review
// ---------------------------------------------------------------------------

function VariantCard({
  variant,
  placementKey,
  variantIndex,
  onUpdate,
  onRegenerate,
  onApprove,
  onGenerateImage,
  regenerating,
  generatingImage,
  product,
}) {
  const plat = PLATFORMS[placementKey];
  const statusInfo = VARIANT_STATUSES[variant.status] || VARIANT_STATUSES.draft;

  const STATUS_BADGE_STYLES = {
    draft: "border-zinc-500/30 bg-zinc-500/10 text-zinc-400",
    approved: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
    exported: "border-blue-500/30 bg-blue-500/10 text-blue-400",
    published: "border-green-500/30 bg-green-500/10 text-green-400",
  };

  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500">
          Variant {variantIndex + 1}
        </span>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
            STATUS_BADGE_STYLES[variant.status] || STATUS_BADGE_STYLES.draft
          }`}
        >
          {statusInfo.label}
        </span>
      </div>

      {/* Headline */}
      <div className="space-y-1">
        <label className="text-[11px] text-zinc-600 uppercase tracking-wider">
          Headline
        </label>
        <Input
          value={variant.headline || ""}
          onChange={(e) => onUpdate({ headline: e.target.value })}
          className="bg-zinc-900/60 border-zinc-800 text-white text-sm h-8"
        />
      </div>

      {/* Primary text */}
      <div className="space-y-1">
        <label className="text-[11px] text-zinc-600 uppercase tracking-wider">
          Primary Text
        </label>
        <Textarea
          value={variant.primary_text || ""}
          onChange={(e) => onUpdate({ primary_text: e.target.value })}
          rows={3}
          className="bg-zinc-900/60 border-zinc-800 text-white text-sm resize-none"
        />
        {plat?.maxCaption && (
          <p className="text-[10px] text-zinc-600 text-right">
            {(variant.primary_text || "").length} / {plat.maxCaption} chars
          </p>
        )}
      </div>

      {/* CTA */}
      <div className="space-y-1">
        <label className="text-[11px] text-zinc-600 uppercase tracking-wider">
          CTA Label
        </label>
        <Input
          value={variant.cta_label || ""}
          onChange={(e) => onUpdate({ cta_label: e.target.value })}
          className="bg-zinc-900/60 border-zinc-800 text-white text-sm h-8"
        />
      </div>

      {/* Ad Image */}
      {variant.image_url ? (
        <div className="relative group rounded-lg overflow-hidden">
          <img
            src={variant.image_url}
            alt="Ad creative"
            className="w-full rounded-lg object-cover max-h-40 bg-zinc-800"
          />
          <button
            type="button"
            onClick={onGenerateImage}
            disabled={generatingImage}
            className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <span className="flex items-center gap-1.5 text-xs text-white font-medium">
              {generatingImage ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Regenerate Image
              {!generatingImage && <CreditCostBadge credits={8} />}
            </span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onGenerateImage}
          disabled={generatingImage}
          className="w-full rounded-lg border border-dashed border-zinc-700/40 bg-zinc-900/30 p-3 flex items-center justify-center gap-2 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-colors disabled:opacity-50"
        >
          {generatingImage ? (
            <>
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
              <span className="text-xs text-cyan-400">Generating image...</span>
            </>
          ) : (
            <>
              <Image className="w-4 h-4 text-zinc-500 shrink-0" />
              <span className="text-xs text-zinc-500">Generate Ad Image</span>
              <CreditCostBadge credits={8} />
            </>
          )}
        </button>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          variant="glass"
          size="xs"
          onClick={onRegenerate}
          disabled={regenerating}
          className="gap-1.5"
        >
          {regenerating ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
          Regenerate
        </Button>
        {variant.status !== "approved" && (
          <Button
            variant="glass"
            size="xs"
            onClick={onApprove}
            className="gap-1.5 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
          >
            <CheckCircle2 className="w-3 h-3" />
            Approve
          </Button>
        )}
      </div>
    </div>
  );
}

function StepGenerate({
  product,
  selectedPlacements,
  campaignName,
  adType,
  campaignGoal,
  targetAudience,
  tone,
  additionalContext,
  generatedVariants,
  setGeneratedVariants,
  generating,
  setGenerating,
  brandVoiceProfile,
}) {
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [regeneratingKey, setRegeneratingKey] = useState(null);
  const [generatingImageKey, setGeneratingImageKey] = useState(null);

  async function handleGenerateImage(placementKey, variantIndex) {
    const key = `${placementKey}-${variantIndex}`;
    setGeneratingImageKey(key);
    try {
      const variant = generatedVariants[placementKey]?.[variantIndex];
      const plat = PLATFORMS[placementKey];
      const productImageUrl =
        typeof product?.featured_image === "string"
          ? product.featured_image
          : product?.featured_image?.url || null;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reach-generate-ad-image`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            product_name: product?.name,
            product_description: product?.description,
            ad_headline: variant?.headline,
            ad_primary_text: variant?.primary_text,
            platform: plat?.name,
            dimensions: { width: plat?.width || 1024, height: plat?.height || 1024 },
            style: "professional",
            product_image_url: productImageUrl,
          }),
        }
      );

      if (!res.ok) {
        throw new Error(`Image generation failed: ${res.status}`);
      }

      const data = await res.json();
      if (data.image_url) {
        handleUpdateVariant(placementKey, variantIndex, { image_url: data.image_url });
        toast.success("Ad image generated");
      } else {
        toast.error(data.error || "Image generation failed");
      }
    } catch (err) {
      console.error("Image generation error:", err);
      toast.error("Failed to generate image");
    } finally {
      setGeneratingImageKey(null);
    }
  }

  async function generateForPlacement(placementKey) {
    const plat = PLATFORMS[placementKey];
    if (!plat) return [];

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reach-generate-ad-copy`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            product: {
              name: product.name,
              description: product.description,
              price: product.price,
              category: product.category,
            },
            platform: placementKey,
            placement: plat.name,
            ad_type: adType,
            campaign_goal: campaignGoal,
            target_audience: targetAudience,
            tone,
            brand_voice_profile: brandVoiceProfile,
            additional_context: additionalContext,
            dimensions: {
              width: plat.width,
              height: plat.height,
              maxCaption: plat.maxCaption,
              maxHeadline: plat.maxHeadline,
              maxDescription: plat.maxDescription,
            },
          }),
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        console.error(`Generation failed for ${placementKey}:`, errText);
        return [];
      }

      const data = await res.json();
      return (data.variants || []).map((v, i) => ({
        ...v,
        platform: placementKey,
        placement: plat.name,
        variant_number: i + 1,
        status: "draft",
        dimensions: { width: plat.width, height: plat.height },
      }));
    } catch (err) {
      console.error(`Generation error for ${placementKey}:`, err);
      return [];
    }
  }

  async function handleGenerateAll() {
    setGenerating(true);
    setProgress({ done: 0, total: selectedPlacements.length });
    const allVariants = {};

    for (const placementKey of selectedPlacements) {
      const variants = await generateForPlacement(placementKey);
      allVariants[placementKey] = variants;
      setProgress((p) => ({ ...p, done: p.done + 1 }));
      setGeneratedVariants((prev) => ({ ...prev, [placementKey]: variants }));
    }

    setGenerating(false);
    toast.success("Ad copy generated for all placements");
  }

  async function handleRegenerate(placementKey, variantIndex) {
    const key = `${placementKey}-${variantIndex}`;
    setRegeneratingKey(key);
    const variants = await generateForPlacement(placementKey);
    if (variants[variantIndex]) {
      setGeneratedVariants((prev) => {
        const updated = { ...prev };
        const existing = [...(updated[placementKey] || [])];
        existing[variantIndex] = {
          ...variants[variantIndex],
          status: "draft",
        };
        updated[placementKey] = existing;
        return updated;
      });
      toast.success("Variant regenerated");
    }
    setRegeneratingKey(null);
  }

  function handleUpdateVariant(placementKey, variantIndex, updates) {
    setGeneratedVariants((prev) => {
      const updated = { ...prev };
      const existing = [...(updated[placementKey] || [])];
      existing[variantIndex] = { ...existing[variantIndex], ...updates };
      updated[placementKey] = existing;
      return updated;
    });
  }

  function handleApproveVariant(placementKey, variantIndex) {
    handleUpdateVariant(placementKey, variantIndex, { status: "approved" });
    toast.success("Variant approved");
  }

  const hasVariants = Object.values(generatedVariants).some(
    (v) => v && v.length > 0
  );

  return (
    <div className="space-y-6 max-h-[540px] overflow-y-auto pr-1">
      {/* Summary */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4 space-y-3">
        <h3 className="text-sm font-medium text-zinc-300">Campaign Summary</h3>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-zinc-500">Product:</span>{" "}
            <span className="text-white">{product?.name}</span>
          </div>
          <div>
            <span className="text-zinc-500">Ad Type:</span>{" "}
            <span className="text-white">
              {AD_TYPES.find((t) => t.value === adType)?.label || adType}
            </span>
          </div>
          <div>
            <span className="text-zinc-500">Goal:</span>{" "}
            <span className="text-white">
              {CAMPAIGN_GOALS.find((g) => g.value === campaignGoal)?.label ||
                campaignGoal}
            </span>
          </div>
          <div>
            <span className="text-zinc-500">Placements:</span>{" "}
            <span className="text-white">{selectedPlacements.length}</span>
          </div>
          {tone && (
            <div>
              <span className="text-zinc-500">Tone:</span>{" "}
              <span className="text-white">
                {TONE_OPTIONS.find((t) => t.value === tone)?.label || tone}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {selectedPlacements.map((p) => {
            const plat = PLATFORMS[p];
            return plat ? (
              <span
                key={p}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] bg-zinc-800/60 text-zinc-400 border border-zinc-700/30"
              >
                {plat.name}
              </span>
            ) : null;
          })}
        </div>
      </div>

      {/* Generate button or progress */}
      {!hasVariants && !generating && (
        <div className="text-center py-4">
          <MotionButton
            variant="glow"
            onClick={handleGenerateAll}
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Generate Ads
            <CreditCostBadge credits={2} />
          </MotionButton>
          <p className="text-xs text-zinc-500 mt-2">
            Generates 3 variants per placement using AI
          </p>
        </div>
      )}

      {generating && (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
            <span className="text-sm text-cyan-400 font-medium">
              Generating ad copy...
            </span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-1.5">
            <motion.div
              className="h-full bg-cyan-500 rounded-full"
              initial={{ width: 0 }}
              animate={{
                width:
                  progress.total > 0
                    ? `${(progress.done / progress.total) * 100}%`
                    : "0%",
              }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-xs text-zinc-500">
            {progress.done} of {progress.total} placements complete
          </p>
        </div>
      )}

      {/* Generated variants per placement */}
      {Object.entries(generatedVariants).map(([placementKey, variants]) => {
        if (!variants || variants.length === 0) return null;
        const plat = PLATFORMS[placementKey];
        return (
          <div key={placementKey} className="space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-zinc-300">
                {plat?.name || placementKey}
              </h4>
              {plat?.width && plat?.height && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800/60 text-zinc-500 border border-zinc-700/30">
                  {plat.width}x{plat.height}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {variants.map((variant, idx) => (
                <VariantCard
                  key={`${placementKey}-${idx}`}
                  variant={variant}
                  placementKey={placementKey}
                  variantIndex={idx}
                  product={product}
                  onUpdate={(updates) =>
                    handleUpdateVariant(placementKey, idx, updates)
                  }
                  onRegenerate={() => handleRegenerate(placementKey, idx)}
                  onApprove={() => handleApproveVariant(placementKey, idx)}
                  onGenerateImage={() => handleGenerateImage(placementKey, idx)}
                  regenerating={regeneratingKey === `${placementKey}-${idx}`}
                  generatingImage={generatingImageKey === `${placementKey}-${idx}`}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Builder
// ---------------------------------------------------------------------------

export default function ReachCampaignBuilder() {
  const { user } = useUser();
  const navigate = useNavigate();

  // Wizard state
  const [step, setStep] = useState(0);

  // Step 1
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [additionalContext, setAdditionalContext] = useState("");

  // Step 2
  const [selectedPlacements, setSelectedPlacements] = useState([]);

  // Step 3
  const [campaignName, setCampaignName] = useState("");
  const [adType, setAdType] = useState("single_image");
  const [campaignGoal, setCampaignGoal] = useState("awareness");
  const [targetAudience, setTargetAudience] = useState("");
  const [tone, setTone] = useState("professional");

  // Step 4
  const [generatedVariants, setGeneratedVariants] = useState({});
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Brand voice
  const [brandVoiceProfile, setBrandVoiceProfile] = useState(null);

  // Load active brand voice profile
  useEffect(() => {
    if (!user?.company_id) return;
    (async () => {
      try {
        const { data } = await supabase
          .from("brand_voice_profiles")
          .select("*")
          .eq("company_id", user.company_id)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();

        if (data) {
          setBrandVoiceProfile(data);
          if (data.tone_descriptors?.length > 0) {
            const matchingTone = TONE_OPTIONS.find((t) =>
              data.tone_descriptors
                .map((d) => d.toLowerCase())
                .includes(t.value.toLowerCase())
            );
            if (matchingTone) setTone(matchingTone.value);
          }
        }
      } catch (err) {
        console.error("Failed to load brand voice:", err);
      }
    })();
  }, [user?.company_id]);

  // Step validation
  const canProceed = useMemo(() => {
    switch (step) {
      case 0:
        return !!selectedProduct;
      case 1:
        return selectedPlacements.length > 0;
      case 2:
        return campaignName.trim().length > 0;
      case 3:
        return true;
      default:
        return false;
    }
  }, [step, selectedProduct, selectedPlacements, campaignName]);

  function handleTogglePlacement(key, add) {
    setSelectedPlacements((prev) => {
      if (add) {
        return prev.includes(key) ? prev : [...prev, key];
      }
      return prev.filter((p) => p !== key);
    });
  }

  async function handleSaveCampaign() {
    if (!user?.company_id) return;
    setSaving(true);

    try {
      // Build unique platform list
      const platformSet = new Set();
      selectedPlacements.forEach((p) => {
        const plat = PLATFORMS[p];
        if (plat) {
          const group = Object.entries(PLATFORM_GROUPS).find(([, g]) =>
            g.placements.includes(p)
          );
          if (group) platformSet.add(group[0]);
        }
      });

      // Create campaign
      const { data: campaign, error: campError } = await supabase
        .from("reach_campaigns")
        .insert({
          company_id: user.company_id,
          created_by: user.id,
          name: campaignName.trim(),
          product_id: selectedProduct.id,
          status: "draft",
          platforms: Array.from(platformSet),
          ad_type: adType,
          campaign_goal: campaignGoal,
          target_audience: { description: targetAudience },
          tone_override: tone,
          brand_voice_profile_id: brandVoiceProfile?.id || null,
          additional_context: additionalContext || null,
        })
        .select("id")
        .single();

      if (campError) throw campError;

      // Create ad variants
      const variantRows = [];
      for (const [placementKey, variants] of Object.entries(generatedVariants)) {
        for (const v of variants) {
          variantRows.push({
            campaign_id: campaign.id,
            platform: placementKey,
            placement: v.placement || PLATFORMS[placementKey]?.name || placementKey,
            variant_number: v.variant_number,
            headline: v.headline || null,
            primary_text: v.primary_text || null,
            cta_label: v.cta_label || null,
            image_url: v.image_url || null,
            video_url: v.video_url || null,
            carousel_slides: v.carousel_slides || null,
            dimensions: v.dimensions || null,
            status: v.status || "draft",
          });
        }
      }

      if (variantRows.length > 0) {
        const { error: varError } = await supabase
          .from("reach_ad_variants")
          .insert(variantRows);
        if (varError) throw varError;
      }

      toast.success("Campaign saved successfully");
      navigate(
        createPageUrl(`ReachCampaignDetail?id=${campaign.id}`)
      );
    } catch (err) {
      console.error("Failed to save campaign:", err);
      toast.error("Failed to save campaign: " + (err.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="p-6 space-y-6 max-w-5xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(createPageUrl("ReachCampaigns"))}
          className="p-2 rounded-lg hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="p-2 rounded-xl bg-cyan-500/10">
          <Wand2 className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">Campaign Builder</h1>
          <p className="text-sm text-zinc-400">
            Create a new ad campaign in 4 steps
          </p>
        </div>
      </div>

      {/* Stepper */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
        <Stepper currentStep={step} steps={STEPS} />
      </div>

      {/* Step content */}
      <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            {step === 0 && (
              <StepProduct
                selected={selectedProduct}
                onSelect={setSelectedProduct}
                additionalContext={additionalContext}
                onContextChange={setAdditionalContext}
              />
            )}
            {step === 1 && (
              <StepPlatforms
                selectedPlacements={selectedPlacements}
                onToggle={handleTogglePlacement}
              />
            )}
            {step === 2 && (
              <StepConfig
                campaignName={campaignName}
                onNameChange={setCampaignName}
                adType={adType}
                onAdTypeChange={setAdType}
                campaignGoal={campaignGoal}
                onGoalChange={setCampaignGoal}
                targetAudience={targetAudience}
                onAudienceChange={setTargetAudience}
                tone={tone}
                onToneChange={setTone}
              />
            )}
            {step === 3 && (
              <StepGenerate
                product={selectedProduct}
                selectedPlacements={selectedPlacements}
                campaignName={campaignName}
                adType={adType}
                campaignGoal={campaignGoal}
                targetAudience={targetAudience}
                tone={tone}
                additionalContext={additionalContext}
                generatedVariants={generatedVariants}
                setGeneratedVariants={setGeneratedVariants}
                generating={generating}
                setGenerating={setGenerating}
                brandVoiceProfile={brandVoiceProfile}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="glass"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Previous
        </Button>

        <div className="flex items-center gap-3">
          {step === 3 &&
            Object.values(generatedVariants).some(
              (v) => v && v.length > 0
            ) && (
              <MotionButton
                variant="glow"
                onClick={handleSaveCampaign}
                disabled={saving}
                loading={saving}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                Save Campaign
              </MotionButton>
            )}

          {step < 3 && (
            <Button
              variant="glow"
              onClick={() => setStep((s) => Math.min(3, s + 1))}
              disabled={!canProceed}
              className="gap-2"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
