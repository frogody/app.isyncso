import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PenLine,
  Megaphone,
  Mail,
  Layout,
  MessageCircle,
  Package,
  Send,
  Loader2,
  Copy,
  Check,
  Save,
  Clock,
  ChevronRight,
  ChevronDown,
  Sparkles,
  RotateCcw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { COPY_USE_CASES, TONE_OPTIONS, PLATFORMS } from "@/lib/reach-constants";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ---------------------------------------------------------------------------
// Icon map for use cases
// ---------------------------------------------------------------------------
const USE_CASE_ICONS = {
  ad_copy: Megaphone,
  email_campaign: Mail,
  landing_page: Layout,
  social_caption: MessageCircle,
  product_description: Package,
  cold_outreach: Send,
};

// ---------------------------------------------------------------------------
// Platform character limits for social captions
// ---------------------------------------------------------------------------
const SOCIAL_PLATFORMS = [
  { value: "instagram", label: "Instagram", charLimit: 2200 },
  { value: "facebook", label: "Facebook", charLimit: 63206 },
  { value: "linkedin", label: "LinkedIn", charLimit: 3000 },
  { value: "twitter", label: "X / Twitter", charLimit: 280 },
  { value: "tiktok", label: "TikTok", charLimit: 2200 },
];

// ---------------------------------------------------------------------------
// Field label map for display in variant cards
// ---------------------------------------------------------------------------
const FIELD_LABELS = {
  headline: "Headline",
  primary_text: "Primary Text",
  cta_label: "CTA Label",
  subject_line: "Subject Line",
  preview_text: "Preview Text",
  body: "Body",
  cta: "Call to Action",
  hero_headline: "Hero Headline",
  hero_subtext: "Hero Subtext",
  sections: "Sections",
  caption: "Caption",
  hashtags: "Hashtags",
  title: "Title",
  short_description: "Short Description",
  long_description: "Long Description",
  key_features: "Key Features",
  subject: "Subject",
  opening: "Opening",
  ps_line: "P.S. Line",
};

// ---------------------------------------------------------------------------
// Initial form state
// ---------------------------------------------------------------------------
const INITIAL_FORM = {
  brand_name: "",
  product_service: "",
  target_audience: "",
  key_message: "",
  tone: "professional",
  // Email
  subject_line_hint: "",
  // Landing page
  sections_to_include: "",
  // Social
  platform: "instagram",
  // Cold outreach
  recipient_role: "",
};

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------
function VariantSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4 animate-pulse">
      <div className="h-5 bg-zinc-800 rounded w-24" />
      <div className="space-y-3">
        <div className="h-4 bg-zinc-800 rounded w-full" />
        <div className="h-4 bg-zinc-800 rounded w-3/4" />
        <div className="h-4 bg-zinc-800 rounded w-5/6" />
      </div>
      <div className="space-y-3">
        <div className="h-4 bg-zinc-800 rounded w-full" />
        <div className="h-4 bg-zinc-800 rounded w-2/3" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Copy-to-clipboard button
// ---------------------------------------------------------------------------
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-cyan-400 transition-colors"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-400" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Render a variant field value
// ---------------------------------------------------------------------------
function FieldValue({ fieldKey, value }) {
  if (value === null || value === undefined) return null;

  // Array of objects (landing page sections)
  if (fieldKey === "sections" && Array.isArray(value)) {
    return (
      <div className="space-y-3">
        {value.map((section, idx) => (
          <div
            key={idx}
            className="rounded-lg bg-zinc-800/40 p-3 border border-zinc-700/50"
          >
            {section.heading && (
              <p className="text-sm font-medium text-white mb-1">
                {section.heading}
              </p>
            )}
            {section.body && (
              <p className="text-sm text-zinc-300">{section.body}</p>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Array of strings (hashtags, key_features)
  if (Array.isArray(value)) {
    if (fieldKey === "hashtags") {
      return (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag, idx) => (
            <span
              key={idx}
              className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
            >
              #{tag}
            </span>
          ))}
        </div>
      );
    }
    return (
      <ul className="space-y-1">
        {value.map((item, idx) => (
          <li key={idx} className="text-sm text-zinc-300 flex items-start gap-2">
            <span className="text-cyan-400 mt-0.5">-</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  // Regular string
  return <p className="text-sm text-zinc-300 whitespace-pre-wrap">{value}</p>;
}

// ---------------------------------------------------------------------------
// Single variant card
// ---------------------------------------------------------------------------
function VariantCard({ variant, index, useCase }) {
  const fields = Object.entries(variant).filter(
    ([key]) => key !== "variant_number"
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden"
    >
      <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-cyan-500/10 flex items-center justify-center">
            <span className="text-xs font-semibold text-cyan-400">
              {index + 1}
            </span>
          </div>
          <span className="text-sm font-medium text-white">
            Variant {index + 1}
          </span>
        </div>
        <Badge
          variant="outline"
          className="text-[10px] border-zinc-700 text-zinc-400"
        >
          {COPY_USE_CASES.find((c) => c.value === useCase)?.label || useCase}
        </Badge>
      </div>
      <div className="p-5 space-y-4">
        {fields.map(([key, value]) => {
          const textValue =
            typeof value === "string"
              ? value
              : Array.isArray(value)
                ? value.join(", ")
                : JSON.stringify(value);

          return (
            <div key={key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  {FIELD_LABELS[key] || key.replace(/_/g, " ")}
                </span>
                <CopyButton text={textValue} />
              </div>
              <FieldValue fieldKey={key} value={value} />
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// History sidebar item
// ---------------------------------------------------------------------------
function HistoryItem({ item, onClick, isActive }) {
  const useCaseMeta = COPY_USE_CASES.find((c) => c.value === item.use_case);
  const preview =
    item.inputs?.key_message?.slice(0, 60) ||
    item.inputs?.brand_name ||
    "Untitled";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl border transition-all ${
        isActive
          ? "border-cyan-500/40 bg-cyan-500/5"
          : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/60"
      }`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <Badge
          variant="outline"
          className="text-[10px] border-zinc-700 text-zinc-400"
        >
          {useCaseMeta?.label || item.use_case}
        </Badge>
        <span className="text-[10px] text-zinc-600">
          {new Date(item.created_at).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
      <p className="text-xs text-zinc-400 truncate">
        {preview}
        {preview.length >= 60 ? "..." : ""}
      </p>
    </button>
  );
}

// ===========================================================================
// Main Component
// ===========================================================================
export default function ReachCopyStudio() {
  const { user } = useUser();
  const companyId = user?.company_id;

  // UI state
  const [activeUseCase, setActiveUseCase] = useState("ad_copy");
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [variants, setVariants] = useState(null);
  const [currentOutputId, setCurrentOutputId] = useState(null);

  // History
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(true);

  // Brand voice
  const [activeBrandVoice, setActiveBrandVoice] = useState(null);

  // ---------- Load active brand voice profile ----------
  useEffect(() => {
    if (!companyId) return;

    async function loadBrandVoice() {
      try {
        const { data, error } = await supabase
          .from("brand_voice_profiles")
          .select("*")
          .eq("company_id", companyId)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          setActiveBrandVoice(data);
          // Auto-fill tone from brand voice if it matches a TONE_OPTION
          if (data.tone_descriptors?.length > 0) {
            const firstTone = data.tone_descriptors[0].toLowerCase();
            const match = TONE_OPTIONS.find(
              (t) => t.value.toLowerCase() === firstTone
            );
            if (match) {
              setForm((prev) => ({ ...prev, tone: match.value }));
            }
          }
        }
      } catch (err) {
        console.error("Failed to load brand voice:", err);
      }
    }

    loadBrandVoice();
  }, [companyId]);

  // ---------- Load history ----------
  const loadHistory = useCallback(async () => {
    if (!companyId) return;
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from("reach_copy_outputs")
        .select("id, use_case, inputs, created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(30);

      if (!error && data) {
        setHistory(data);
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // ---------- Handle form changes ----------
  const updateField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ---------- Reset form ----------
  const resetForm = useCallback(() => {
    setForm({ ...INITIAL_FORM });
    setVariants(null);
    setCurrentOutputId(null);
  }, []);

  // ---------- Generate copy ----------
  const handleGenerate = useCallback(async () => {
    if (!form.brand_name.trim()) {
      toast.error("Brand name is required");
      return;
    }
    if (!form.key_message.trim()) {
      toast.error("Key message is required");
      return;
    }

    setGenerating(true);
    setVariants(null);

    try {
      // Build extra fields based on use case
      const extraFields = {};
      if (activeUseCase === "email_campaign" && form.subject_line_hint) {
        extraFields.subject_line_hint = form.subject_line_hint;
      }
      if (activeUseCase === "landing_page" && form.sections_to_include) {
        extraFields.sections_to_include = form.sections_to_include;
      }
      if (activeUseCase === "social_caption") {
        const platformMeta = SOCIAL_PLATFORMS.find(
          (p) => p.value === form.platform
        );
        extraFields.platform = platformMeta?.label || form.platform;
        extraFields.character_limit = platformMeta?.charLimit || 2200;
      }
      if (activeUseCase === "cold_outreach" && form.recipient_role) {
        extraFields.recipient_role = form.recipient_role;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reach-generate-copy`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            use_case: activeUseCase,
            brand_name: form.brand_name,
            product_service: form.product_service,
            target_audience: form.target_audience,
            tone: form.tone,
            key_message: form.key_message,
            brand_voice_profile: activeBrandVoice || undefined,
            extra_fields:
              Object.keys(extraFields).length > 0 ? extraFields : undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Generation failed");
      }

      if (data.variants) {
        setVariants(data.variants);
        setCurrentOutputId(null);
        toast.success("3 variants generated");
      }
    } catch (err) {
      console.error("Generation error:", err);
      toast.error(err.message || "Failed to generate copy");
    } finally {
      setGenerating(false);
    }
  }, [activeUseCase, form, activeBrandVoice]);

  // ---------- Save to database ----------
  const handleSave = useCallback(async () => {
    if (!variants || !companyId || !user?.id) return;

    setSaving(true);
    try {
      const payload = {
        company_id: companyId,
        created_by: user.id,
        use_case: activeUseCase,
        inputs: {
          brand_name: form.brand_name,
          product_service: form.product_service,
          target_audience: form.target_audience,
          key_message: form.key_message,
          tone: form.tone,
          ...(activeUseCase === "email_campaign" && {
            subject_line_hint: form.subject_line_hint,
          }),
          ...(activeUseCase === "landing_page" && {
            sections_to_include: form.sections_to_include,
          }),
          ...(activeUseCase === "social_caption" && {
            platform: form.platform,
          }),
          ...(activeUseCase === "cold_outreach" && {
            recipient_role: form.recipient_role,
          }),
        },
        variants,
        brand_voice_profile_id: activeBrandVoice?.id || null,
      };

      if (currentOutputId) {
        // Update existing
        const { error } = await supabase
          .from("reach_copy_outputs")
          .update({ variants, inputs: payload.inputs })
          .eq("id", currentOutputId);

        if (error) throw error;
        toast.success("Output updated");
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("reach_copy_outputs")
          .insert(payload)
          .select("id")
          .single();

        if (error) throw error;
        setCurrentOutputId(data.id);
        toast.success("Output saved");
      }

      // Refresh history
      loadHistory();
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Failed to save output");
    } finally {
      setSaving(false);
    }
  }, [
    variants,
    companyId,
    user,
    activeUseCase,
    form,
    activeBrandVoice,
    currentOutputId,
    loadHistory,
  ]);

  // ---------- Load from history ----------
  const handleLoadFromHistory = useCallback(
    async (item) => {
      try {
        const { data, error } = await supabase
          .from("reach_copy_outputs")
          .select("*")
          .eq("id", item.id)
          .single();

        if (error) throw error;

        setActiveUseCase(data.use_case);
        setForm({
          ...INITIAL_FORM,
          ...(data.inputs || {}),
        });
        setVariants(data.variants || null);
        setCurrentOutputId(data.id);
      } catch (err) {
        console.error("Load history item error:", err);
        toast.error("Failed to load saved output");
      }
    },
    []
  );

  // ---------- Selected platform character limit ----------
  const selectedPlatform = useMemo(
    () => SOCIAL_PLATFORMS.find((p) => p.value === form.platform),
    [form.platform]
  );

  // =========================================================================
  // Render
  // =========================================================================
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="p-6 space-y-6"
    >
      {/* ---------- Header ---------- */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10">
            <PenLine className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-white">
                Copy Studio
              </h1>
              {activeBrandVoice && (
                <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[10px]">
                  {activeBrandVoice.name}
                </Badge>
              )}
            </div>
            <p className="text-sm text-zinc-400">
              Generate and refine marketing copy with AI assistance
            </p>
          </div>
        </div>
      </div>

      {/* ---------- Main layout: form + history ---------- */}
      <div className="flex gap-6 flex-col lg:flex-row">
        {/* ===== Left: Form & Output ===== */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Use case tabs */}
          <Tabs
            value={activeUseCase}
            onValueChange={(v) => {
              setActiveUseCase(v);
              setVariants(null);
              setCurrentOutputId(null);
            }}
          >
            <TabsList className="bg-zinc-900/60 border border-zinc-800 p-1 flex flex-wrap gap-1 h-auto">
              {COPY_USE_CASES.map((uc) => {
                const Icon = USE_CASE_ICONS[uc.value] || PenLine;
                return (
                  <TabsTrigger
                    key={uc.value}
                    value={uc.value}
                    className="data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400 data-[state=active]:border-cyan-500/20 border border-transparent rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1.5"
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {uc.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {/* Each tab renders the same form structure with use-case-specific extras */}
            {COPY_USE_CASES.map((uc) => (
              <TabsContent key={uc.value} value={uc.value} className="mt-5">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-5">
                  {/* Common fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-400">
                        Brand Name *
                      </label>
                      <Input
                        placeholder="e.g. iSyncSO"
                        value={form.brand_name}
                        onChange={(e) =>
                          updateField("brand_name", e.target.value)
                        }
                        className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-400">
                        Product / Service
                      </label>
                      <Input
                        placeholder="e.g. AI-powered business platform"
                        value={form.product_service}
                        onChange={(e) =>
                          updateField("product_service", e.target.value)
                        }
                        className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400">
                      Target Audience
                    </label>
                    <Textarea
                      placeholder="Describe your ideal customer/reader..."
                      value={form.target_audience}
                      onChange={(e) =>
                        updateField("target_audience", e.target.value)
                      }
                      rows={2}
                      className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400">
                      Key Message *
                    </label>
                    <Textarea
                      placeholder="What is the core message you want to communicate?"
                      value={form.key_message}
                      onChange={(e) =>
                        updateField("key_message", e.target.value)
                      }
                      rows={3}
                      className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 resize-none"
                    />
                  </div>

                  {/* Tone selector */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-400">
                        Tone
                      </label>
                      <Select
                        value={form.tone}
                        onValueChange={(v) => updateField("tone", v)}
                      >
                        <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700">
                          {TONE_OPTIONS.map((t) => (
                            <SelectItem
                              key={t.value}
                              value={t.value}
                              className="text-zinc-200 focus:bg-zinc-800 focus:text-white"
                            >
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Use-case-specific fields */}
                    {uc.value === "email_campaign" && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-400">
                          Subject Line Hint
                        </label>
                        <Input
                          placeholder="Optional direction for subject line"
                          value={form.subject_line_hint}
                          onChange={(e) =>
                            updateField("subject_line_hint", e.target.value)
                          }
                          className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600"
                        />
                      </div>
                    )}

                    {uc.value === "social_caption" && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-400">
                          Platform
                        </label>
                        <Select
                          value={form.platform}
                          onValueChange={(v) => updateField("platform", v)}
                        >
                          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-zinc-700">
                            {SOCIAL_PLATFORMS.map((p) => (
                              <SelectItem
                                key={p.value}
                                value={p.value}
                                className="text-zinc-200 focus:bg-zinc-800 focus:text-white"
                              >
                                {p.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {uc.value === "cold_outreach" && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-400">
                          Recipient Role
                        </label>
                        <Input
                          placeholder="e.g. VP of Marketing, CTO"
                          value={form.recipient_role}
                          onChange={(e) =>
                            updateField("recipient_role", e.target.value)
                          }
                          className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600"
                        />
                      </div>
                    )}
                  </div>

                  {/* Landing page extra */}
                  {uc.value === "landing_page" && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-400">
                        Sections to Include
                      </label>
                      <Textarea
                        placeholder="e.g. Hero, Features, Testimonials, Pricing, FAQ, CTA"
                        value={form.sections_to_include}
                        onChange={(e) =>
                          updateField("sections_to_include", e.target.value)
                        }
                        rows={2}
                        className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 resize-none"
                      />
                    </div>
                  )}

                  {/* Social caption char limit indicator */}
                  {uc.value === "social_caption" && selectedPlatform && (
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>
                        {selectedPlatform.label} character limit:{" "}
                        <span className="text-cyan-400">
                          {selectedPlatform.charLimit.toLocaleString()}
                        </span>
                      </span>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      onClick={handleGenerate}
                      disabled={generating}
                      className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 disabled:opacity-50"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate
                        </>
                      )}
                    </Button>

                    {variants && (
                      <>
                        <Button
                          onClick={handleSave}
                          disabled={saving}
                          variant="outline"
                          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                        >
                          {saving ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4 mr-2" />
                          )}
                          {currentOutputId ? "Update" : "Save"}
                        </Button>
                        <Button
                          onClick={resetForm}
                          variant="ghost"
                          className="text-zinc-500 hover:text-zinc-300"
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Reset
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>

          {/* ---------- Output Section ---------- */}
          {generating && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                Generating 3 variants...
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <VariantSkeleton />
                <VariantSkeleton />
                <VariantSkeleton />
              </div>
            </div>
          )}

          <AnimatePresence>
            {variants && !generating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <h3 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-400" />
                  {variants.length} variant{variants.length !== 1 ? "s" : ""}{" "}
                  generated
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  {variants.map((variant, idx) => (
                    <VariantCard
                      key={idx}
                      variant={variant}
                      index={idx}
                      useCase={activeUseCase}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ===== Right: History Sidebar ===== */}
        <div className="lg:w-80 flex-shrink-0">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden sticky top-6">
            {/* History header */}
            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              className="w-full flex items-center justify-between px-4 py-3 border-b border-zinc-800 hover:bg-zinc-800/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-500" />
                <span className="text-sm font-medium text-white">History</span>
                {history.length > 0 && (
                  <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded-full">
                    {history.length}
                  </span>
                )}
              </div>
              <ChevronDown
                className={`w-4 h-4 text-zinc-500 transition-transform ${
                  historyOpen ? "" : "-rotate-90"
                }`}
              />
            </button>

            <AnimatePresence>
              {historyOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 space-y-2 max-h-[500px] overflow-y-auto">
                    {historyLoading ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="rounded-xl border border-zinc-800 p-3 animate-pulse"
                          >
                            <div className="h-3 bg-zinc-800 rounded w-20 mb-2" />
                            <div className="h-3 bg-zinc-800 rounded w-full" />
                          </div>
                        ))}
                      </div>
                    ) : history.length === 0 ? (
                      <div className="text-center py-8">
                        <PenLine className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                        <p className="text-xs text-zinc-500">
                          No saved outputs yet
                        </p>
                        <p className="text-[10px] text-zinc-600 mt-1">
                          Generate and save copy to see it here
                        </p>
                      </div>
                    ) : (
                      history.map((item) => (
                        <HistoryItem
                          key={item.id}
                          item={item}
                          isActive={currentOutputId === item.id}
                          onClick={() => handleLoadFromHistory(item)}
                        />
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
