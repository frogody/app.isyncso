import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Megaphone,
  Loader2,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Pause,
  Play,
  CalendarPlus,
  Copy,
  Image,
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
  Globe,
  Music2,
  Search as SearchIcon,
  Package,
  AlertTriangle,
  Edit3,
  Target,
  Eye,
  RotateCcw,
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
  AD_TYPES,
  CAMPAIGN_GOALS,
  CAMPAIGN_STATUSES,
  VARIANT_STATUSES,
  TONE_OPTIONS,
} from "@/lib/reach-constants";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLATFORM_ICONS = {
  Instagram: Instagram,
  Facebook: Facebook,
  Linkedin: Linkedin,
  Youtube: Youtube,
  Globe: Globe,
  Search: SearchIcon,
  Music2: Music2,
};

const STATUS_STYLES = {
  draft: "border-zinc-500/30 bg-zinc-500/10 text-zinc-400",
  active: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
  paused: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  completed: "border-green-500/30 bg-green-500/10 text-green-400",
};

const VARIANT_STATUS_STYLES = {
  draft: "border-zinc-500/30 bg-zinc-500/10 text-zinc-400",
  approved: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
  exported: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  published: "border-green-500/30 bg-green-500/10 text-green-400",
};

// ---------------------------------------------------------------------------
// Variant Card
// ---------------------------------------------------------------------------

function DetailVariantCard({ variant, campaign, onUpdate, onApprove, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [localData, setLocalData] = useState({
    headline: variant.headline || "",
    primary_text: variant.primary_text || "",
    cta_label: variant.cta_label || "",
  });
  const [saving, setSaving] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);

  const statusInfo =
    VARIANT_STATUSES[variant.status] || VARIANT_STATUSES.draft;
  const plat = PLATFORMS[variant.platform];

  function handleLocalChange(field, value) {
    setLocalData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSaveEdits() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("reach_ad_variants")
        .update({
          headline: localData.headline,
          primary_text: localData.primary_text,
          cta_label: localData.cta_label,
        })
        .eq("id", variant.id);

      if (error) throw error;
      onUpdate({ ...variant, ...localData });
      setEditing(false);
      toast.success("Variant updated");
    } catch (err) {
      console.error("Failed to update variant:", err);
      toast.error("Failed to update variant");
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove() {
    try {
      const { error } = await supabase
        .from("reach_ad_variants")
        .update({ status: "approved" })
        .eq("id", variant.id);
      if (error) throw error;
      onApprove(variant.id);
      toast.success("Variant approved");
    } catch (err) {
      toast.error("Failed to approve variant");
    }
  }

  function handleCopyText() {
    const text = `${localData.headline}\n\n${localData.primary_text}\n\nCTA: ${localData.cta_label}`;
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }

  async function handleGenerateImage() {
    setGeneratingImage(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reach-generate-ad-image`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            product_name: campaign?.product_name,
            ad_headline: variant.headline,
            platform: variant.platform || variant.placement,
            dimensions: variant.dimensions || { width: 1024, height: 1024 },
            style: "professional",
          }),
        }
      );

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Request failed (${res.status})`);
      }

      const body = await res.json();
      const imageUrl = body.image_url || body.url;

      if (!imageUrl) throw new Error("No image URL returned");

      // Persist the image_url to the database
      const { error: dbError } = await supabase
        .from("reach_ad_variants")
        .update({ image_url: imageUrl })
        .eq("id", variant.id);

      if (dbError) {
        console.error("Failed to save image URL:", dbError);
        toast.error("Image generated but failed to save");
      }

      onUpdate({ ...variant, image_url: imageUrl });
      toast.success("Image generated successfully");
    } catch (err) {
      console.error("Failed to generate image:", err);
      toast.error(err.message || "Failed to generate image");
    } finally {
      setGeneratingImage(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-500">
            #{variant.variant_number}
          </span>
          {plat?.name && (
            <span className="text-xs text-zinc-600">{plat.name}</span>
          )}
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
            VARIANT_STATUS_STYLES[variant.status] || VARIANT_STATUS_STYLES.draft
          }`}
        >
          {statusInfo.label}
        </span>
      </div>

      {/* Content */}
      {editing ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] text-zinc-600 uppercase tracking-wider">
              Headline
            </label>
            <Input
              value={localData.headline}
              onChange={(e) => handleLocalChange("headline", e.target.value)}
              className="bg-zinc-900/60 border-zinc-800 text-white text-sm h-8"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-zinc-600 uppercase tracking-wider">
              Primary Text
            </label>
            <Textarea
              value={localData.primary_text}
              onChange={(e) => handleLocalChange("primary_text", e.target.value)}
              rows={4}
              className="bg-zinc-900/60 border-zinc-800 text-white text-sm resize-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-zinc-600 uppercase tracking-wider">
              CTA
            </label>
            <Input
              value={localData.cta_label}
              onChange={(e) => handleLocalChange("cta_label", e.target.value)}
              className="bg-zinc-900/60 border-zinc-800 text-white text-sm h-8"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="glow"
              size="xs"
              onClick={handleSaveEdits}
              disabled={saving}
              className="gap-1"
            >
              {saving ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3 h-3" />
              )}
              Save
            </Button>
            <Button
              variant="glass"
              size="xs"
              onClick={() => {
                setLocalData({
                  headline: variant.headline || "",
                  primary_text: variant.primary_text || "",
                  cta_label: variant.cta_label || "",
                });
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {localData.headline && (
            <div>
              <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
                Headline
              </span>
              <p className="text-sm text-white font-medium mt-0.5">
                {localData.headline}
              </p>
            </div>
          )}
          {localData.primary_text && (
            <div>
              <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
                Body
              </span>
              <p className="text-sm text-zinc-300 mt-0.5 whitespace-pre-wrap line-clamp-4">
                {localData.primary_text}
              </p>
            </div>
          )}
          {localData.cta_label && (
            <div>
              <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
                CTA
              </span>
              <p className="text-sm text-cyan-400 font-medium mt-0.5">
                {localData.cta_label}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Image / Generate Image */}
      {variant.image_url ? (
        <div className="relative group">
          <img
            src={variant.image_url}
            alt="Ad creative"
            className="w-full rounded-lg object-cover max-h-40"
          />
          <div className="absolute inset-0 rounded-lg bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button
              variant="glass"
              size="xs"
              onClick={handleGenerateImage}
              disabled={generatingImage}
              className="gap-1.5"
            >
              {generatingImage ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              {generatingImage ? "Generating..." : "Regenerate Image"}
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={handleGenerateImage}
          disabled={generatingImage}
          className="w-full rounded-lg border border-dashed border-zinc-700/40 bg-zinc-900/30 p-3 flex items-center justify-center gap-2 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generatingImage ? (
            <>
              <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />
              <span className="text-[11px] text-cyan-400">Generating image...</span>
            </>
          ) : (
            <>
              <Image className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span className="text-[11px] text-zinc-500">Generate Image</span>
            </>
          )}
        </button>
      )}

      {/* Actions */}
      {!editing && (
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <Button
            variant="glass"
            size="xs"
            onClick={() => setEditing(true)}
            className="gap-1"
          >
            <Edit3 className="w-3 h-3" />
            Edit
          </Button>
          {variant.status !== "approved" && (
            <Button
              variant="glass"
              size="xs"
              onClick={handleApprove}
              className="gap-1 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
            >
              <CheckCircle2 className="w-3 h-3" />
              Approve
            </Button>
          )}
          <Button
            variant="glass"
            size="xs"
            onClick={handleCopyText}
            className="gap-1"
          >
            <Copy className="w-3 h-3" />
            Copy
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Detail Page
// ---------------------------------------------------------------------------

export default function ReachCampaignDetail() {
  const { user } = useUser();
  const navigate = useNavigate();

  const campaignId = useMemo(() => {
    return new URLSearchParams(window.location.search).get("id");
  }, []);

  const [campaign, setCampaign] = useState(null);
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  const fetchCampaign = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    try {
      const [campRes, varRes] = await Promise.all([
        supabase
          .from("reach_campaigns")
          .select("*, products:product_id(name, description, featured_image, category)")
          .eq("id", campaignId)
          .single(),
        supabase
          .from("reach_ad_variants")
          .select("*")
          .eq("campaign_id", campaignId)
          .order("platform")
          .order("variant_number"),
      ]);

      if (campRes.error) throw campRes.error;
      setCampaign({
        ...campRes.data,
        product_name: campRes.data.products?.name || null,
        product_image: campRes.data.products?.featured_image || null,
        product_category: campRes.data.products?.category || null,
      });

      if (!varRes.error) {
        setVariants(varRes.data || []);
      }
    } catch (err) {
      console.error("Failed to load campaign:", err);
      toast.error("Failed to load campaign");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  // Group variants by platform
  const variantsByPlatform = useMemo(() => {
    const grouped = {};
    for (const v of variants) {
      if (!grouped[v.platform]) grouped[v.platform] = [];
      grouped[v.platform].push(v);
    }
    return grouped;
  }, [variants]);

  // Unique platforms for tabs
  const platforms = useMemo(() => {
    return [...new Set(variants.map((v) => v.platform))];
  }, [variants]);

  function handleVariantUpdate(updated) {
    setVariants((prev) =>
      prev.map((v) => (v.id === updated.id ? { ...v, ...updated } : v))
    );
  }

  function handleVariantApprove(variantId) {
    setVariants((prev) =>
      prev.map((v) => (v.id === variantId ? { ...v, status: "approved" } : v))
    );
  }

  async function handleToggleStatus() {
    if (!campaign) return;
    setTogglingStatus(true);
    const newStatus =
      campaign.status === "active" ? "paused" : "active";
    try {
      const { error } = await supabase
        .from("reach_campaigns")
        .update({ status: newStatus })
        .eq("id", campaign.id);
      if (error) throw error;
      setCampaign((prev) => ({ ...prev, status: newStatus }));
      toast.success(`Campaign ${newStatus === "active" ? "activated" : "paused"}`);
    } catch (err) {
      toast.error("Failed to update status");
    } finally {
      setTogglingStatus(false);
    }
  }

  async function handleDelete() {
    if (!campaign) return;
    setDeleting(true);
    try {
      // Delete variants first
      await supabase
        .from("reach_ad_variants")
        .delete()
        .eq("campaign_id", campaign.id);

      // Delete campaign
      const { error } = await supabase
        .from("reach_campaigns")
        .delete()
        .eq("id", campaign.id);

      if (error) throw error;
      toast.success("Campaign deleted");
      navigate(createPageUrl("ReachCampaigns"));
    } catch (err) {
      toast.error("Failed to delete campaign");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  // Determine which variants to show
  const displayVariants = useMemo(() => {
    if (activeTab === "all") return variants;
    return variantsByPlatform[activeTab] || [];
  }, [activeTab, variants, variantsByPlatform]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center min-h-[400px] rounded-2xl border border-zinc-800 bg-zinc-900/50">
          <div className="text-center space-y-2">
            <AlertTriangle className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-zinc-400">Campaign not found</p>
            <Button
              variant="glass"
              onClick={() => navigate(createPageUrl("ReachCampaigns"))}
            >
              Back to Campaigns
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const statusInfo =
    CAMPAIGN_STATUSES[campaign.status] || CAMPAIGN_STATUSES.draft;
  const adType = AD_TYPES.find((t) => t.value === campaign.ad_type);
  const goal = CAMPAIGN_GOALS.find((g) => g.value === campaign.campaign_goal);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="p-6 space-y-6 max-w-6xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(createPageUrl("ReachCampaigns"))}
            className="p-2 rounded-lg hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="p-2 rounded-xl bg-cyan-500/10">
            <Megaphone className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-white">
                {campaign.name}
              </h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                  STATUS_STYLES[campaign.status] || STATUS_STYLES.draft
                }`}
              >
                {statusInfo.label}
              </span>
            </div>
            <p className="text-sm text-zinc-400 mt-0.5">
              {campaign.product_name && (
                <span className="text-zinc-300">{campaign.product_name}</span>
              )}
              {adType && (
                <span>
                  {campaign.product_name ? " / " : ""}
                  {adType.label}
                </span>
              )}
              {goal && <span> / {goal.label}</span>}
            </p>
          </div>
        </div>

        {/* Campaign actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="glass"
            size="sm"
            onClick={handleToggleStatus}
            disabled={togglingStatus}
            className="gap-1.5"
          >
            {togglingStatus ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : campaign.status === "active" ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            {campaign.status === "active" ? "Pause" : "Activate"}
          </Button>
          <Button
            variant="glass"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            className="gap-1.5 border-red-500/30 text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Campaign info row */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
        <div className="flex items-center gap-4 flex-wrap text-sm">
          {campaign.product_image && (
            <img
              src={campaign.product_image}
              alt=""
              className="w-10 h-10 rounded-lg object-cover bg-zinc-800"
            />
          )}
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-zinc-500" />
            <span className="text-zinc-300">
              {campaign.product_name || "No product"}
            </span>
          </div>
          {campaign.product_category && (
            <Badge variant="info" size="xs">
              {campaign.product_category}
            </Badge>
          )}
          {campaign.tone_override && (
            <span className="text-xs text-zinc-500">
              Tone:{" "}
              {TONE_OPTIONS.find((t) => t.value === campaign.tone_override)
                ?.label || campaign.tone_override}
            </span>
          )}
          <span className="text-xs text-zinc-600">
            {variants.length} variant{variants.length !== 1 ? "s" : ""} across{" "}
            {platforms.length} placement{platforms.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900/60 border border-zinc-800/60 overflow-x-auto">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
            activeTab === "all"
              ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
              : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50 border border-transparent"
          }`}
        >
          All Variants ({variants.length})
        </button>
        {platforms.map((platformKey) => {
          const plat = PLATFORMS[platformKey];
          const PlatIcon = plat ? PLATFORM_ICONS[plat.icon] : null;
          const count = (variantsByPlatform[platformKey] || []).length;
          return (
            <button
              key={platformKey}
              onClick={() => setActiveTab(platformKey)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === platformKey
                  ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                  : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50 border border-transparent"
              }`}
            >
              {PlatIcon && <PlatIcon className="w-3.5 h-3.5" />}
              {plat?.name || platformKey} ({count})
            </button>
          );
        })}
      </div>

      {/* Variants grid */}
      {displayVariants.length === 0 ? (
        <div className="flex items-center justify-center min-h-[200px] rounded-2xl border border-zinc-800 bg-zinc-900/50">
          <div className="text-center space-y-2">
            <Megaphone className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-zinc-400">No variants for this view</p>
          </div>
        </div>
      ) : activeTab === "all" ? (
        // Grouped by platform
        <div className="space-y-6">
          {Object.entries(variantsByPlatform).map(([platKey, platVariants]) => {
            const plat = PLATFORMS[platKey];
            const PlatIcon = plat ? PLATFORM_ICONS[plat.icon] : null;
            return (
              <div key={platKey} className="space-y-3">
                <div className="flex items-center gap-2">
                  {PlatIcon && (
                    <PlatIcon className="w-4 h-4 text-zinc-400" />
                  )}
                  <h3 className="text-sm font-medium text-zinc-300">
                    {plat?.name || platKey}
                  </h3>
                  {plat?.width && plat?.height && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800/60 text-zinc-500 border border-zinc-700/30">
                      {plat.width}x{plat.height}
                    </span>
                  )}
                  <span className="text-xs text-zinc-600">
                    {platVariants.length} variant
                    {platVariants.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {platVariants.map((v) => (
                    <DetailVariantCard
                      key={v.id}
                      variant={v}
                      campaign={campaign}
                      onUpdate={handleVariantUpdate}
                      onApprove={handleVariantApprove}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Single platform view
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {displayVariants.map((v) => (
            <DetailVariantCard
              key={v.id}
              variant={v}
              campaign={campaign}
              onUpdate={handleVariantUpdate}
              onApprove={handleVariantApprove}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation overlay */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => !deleting && setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-red-500/10">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Delete Campaign</h3>
                  <p className="text-sm text-zinc-400">
                    This will permanently delete this campaign and all its
                    variants.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 justify-end">
                <Button
                  variant="glass"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <MotionButton
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting}
                  loading={deleting}
                  className="gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </MotionButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
