import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Volume2,
  Plus,
  Trash2,
  Sparkles,
  Save,
  Loader2,
  X,
  Check,
  AlertCircle,
  Pencil,
  RotateCcw,
  Clock,
  ChevronDown,
  ChevronUp,
  FileText,
  Zap,
  BookOpen,
  Shield,
  MessageSquare,
} from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------
const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.35 },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------
function Skeleton({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-zinc-800/60 ${className}`}
    />
  );
}

function AnalysisSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3"
          >
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tone color map
// ---------------------------------------------------------------------------
const TONE_COLORS = [
  "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "bg-violet-500/20 text-violet-300 border-violet-500/30",
  "bg-amber-500/20 text-amber-300 border-amber-500/30",
  "bg-rose-500/20 text-rose-300 border-rose-500/30",
  "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  "bg-pink-500/20 text-pink-300 border-pink-500/30",
  "bg-teal-500/20 text-teal-300 border-teal-500/30",
];

function getToneColor(index) {
  return TONE_COLORS[index % TONE_COLORS.length];
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SampleInput({ index, value, onChange, onRemove, canRemove }) {
  return (
    <motion.div
      variants={fadeIn}
      custom={index}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      className="relative group"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-2.5">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 text-xs font-medium border border-zinc-700">
            {index + 1}
          </span>
        </div>
        <div className="flex-1">
          <Textarea
            value={value}
            onChange={(e) => onChange(index, e.target.value)}
            placeholder={`Paste a text sample here (e.g. blog post, social media caption, email, website copy)...`}
            className="min-h-[120px] bg-zinc-900/50 border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus:border-cyan-500/50 focus:ring-cyan-500/20 resize-y"
          />
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-xs text-zinc-600">
              {value.length > 0
                ? `${value.split(/\s+/).filter(Boolean).length} words`
                : "Minimum 50 words recommended"}
            </span>
            {canRemove && (
              <button
                onClick={() => onRemove(index)}
                className="text-xs text-zinc-600 hover:text-red-400 transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-3 h-3" />
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ToneDescriptorsCard({ descriptors, editMode, onUpdate }) {
  const [editValue, setEditValue] = useState(descriptors?.join(", ") || "");

  useEffect(() => {
    setEditValue(descriptors?.join(", ") || "");
  }, [descriptors]);

  return (
    <motion.div
      variants={fadeIn}
      className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5"
    >
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4 text-cyan-400" />
        <h3 className="text-sm font-medium text-white">Tone Descriptors</h3>
      </div>
      {editMode ? (
        <div className="space-y-2">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() =>
              onUpdate(
                "tone_descriptors",
                editValue.split(",").map((s) => s.trim()).filter(Boolean)
              )
            }
            placeholder="Comma-separated adjectives"
            className="bg-zinc-800/50 border-zinc-700 text-zinc-200"
          />
          <p className="text-xs text-zinc-600">Separate with commas</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {descriptors?.map((desc, i) => (
            <motion.span
              key={desc}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.08 }}
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${getToneColor(i)}`}
            >
              {desc}
            </motion.span>
          ))}
          {(!descriptors || descriptors.length === 0) && (
            <span className="text-zinc-600 text-sm">No tone descriptors</span>
          )}
        </div>
      )}
    </motion.div>
  );
}

function VocabularyCard({ vocabulary, editMode, onUpdate }) {
  const [editPreferred, setEditPreferred] = useState("");
  const [editAvoided, setEditAvoided] = useState("");

  useEffect(() => {
    setEditPreferred(vocabulary?.preferred_words?.join(", ") || "");
    setEditAvoided(vocabulary?.avoided_words?.join(", ") || "");
  }, [vocabulary]);

  return (
    <motion.div
      variants={fadeIn}
      className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5"
    >
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="w-4 h-4 text-blue-400" />
        <h3 className="text-sm font-medium text-white">
          Vocabulary Preferences
        </h3>
      </div>
      {editMode ? (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">
              Preferred words
            </label>
            <Input
              value={editPreferred}
              onChange={(e) => setEditPreferred(e.target.value)}
              onBlur={() =>
                onUpdate("vocabulary_preferences", {
                  ...vocabulary,
                  preferred_words: editPreferred.split(",").map((s) => s.trim()).filter(Boolean),
                })
              }
              className="bg-zinc-800/50 border-zinc-700 text-zinc-200"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">
              Words to avoid
            </label>
            <Input
              value={editAvoided}
              onChange={(e) => setEditAvoided(e.target.value)}
              onBlur={() =>
                onUpdate("vocabulary_preferences", {
                  ...vocabulary,
                  avoided_words: editAvoided.split(",").map((s) => s.trim()).filter(Boolean),
                })
              }
              className="bg-zinc-800/50 border-zinc-700 text-zinc-200"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">
              Preferred Words
            </p>
            <div className="flex flex-wrap gap-1.5">
              {vocabulary?.preferred_words?.map((word) => (
                <span
                  key={word}
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                >
                  {word}
                </span>
              ))}
              {(!vocabulary?.preferred_words ||
                vocabulary.preferred_words.length === 0) && (
                <span className="text-zinc-600 text-xs">None detected</span>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">
              Words to Avoid
            </p>
            <div className="flex flex-wrap gap-1.5">
              {vocabulary?.avoided_words?.map((word) => (
                <span
                  key={word}
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-red-500/10 text-red-300 border border-red-500/20"
                >
                  {word}
                </span>
              ))}
              {(!vocabulary?.avoided_words ||
                vocabulary.avoided_words.length === 0) && (
                <span className="text-zinc-600 text-xs">None detected</span>
              )}
            </div>
          </div>
          {vocabulary?.industry_jargon?.length > 0 && (
            <div>
              <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">
                Industry Jargon
              </p>
              <div className="flex flex-wrap gap-1.5">
                {vocabulary.industry_jargon.map((word) => (
                  <span
                    key={word}
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-violet-500/10 text-violet-300 border border-violet-500/20"
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>
          )}
          {vocabulary?.power_words?.length > 0 && (
            <div>
              <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">
                Power Words
              </p>
              <div className="flex flex-wrap gap-1.5">
                {vocabulary.power_words.map((word) => (
                  <span
                    key={word}
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20"
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

function SentencePatternsCard({ patterns, editMode, onUpdate }) {
  const [editPatterns, setEditPatterns] = useState(patterns || []);

  useEffect(() => {
    setEditPatterns(patterns || []);
  }, [patterns]);

  function handlePatternChange(idx, field, value) {
    const updated = editPatterns.map((p, i) =>
      i === idx ? { ...p, [field]: value } : p
    );
    setEditPatterns(updated);
    onUpdate("sentence_patterns", updated);
  }

  return (
    <motion.div
      variants={fadeIn}
      className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5"
    >
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-violet-400" />
        <h3 className="text-sm font-medium text-white">Sentence Patterns</h3>
      </div>
      <div className="space-y-3">
        {(editMode ? editPatterns : patterns)?.map((p, i) => (
          <div
            key={i}
            className="rounded-xl bg-zinc-800/30 border border-zinc-800/50 p-3 space-y-1.5"
          >
            {editMode ? (
              <div className="space-y-2">
                <Input
                  value={p.pattern}
                  onChange={(e) =>
                    handlePatternChange(i, "pattern", e.target.value)
                  }
                  placeholder="Pattern name"
                  className="bg-zinc-900/50 border-zinc-700 text-zinc-200 text-sm"
                />
                <Input
                  value={p.example}
                  onChange={(e) =>
                    handlePatternChange(i, "example", e.target.value)
                  }
                  placeholder="Example"
                  className="bg-zinc-900/50 border-zinc-700 text-zinc-200 text-sm"
                />
                <Input
                  value={p.description}
                  onChange={(e) =>
                    handlePatternChange(i, "description", e.target.value)
                  }
                  placeholder="Description"
                  className="bg-zinc-900/50 border-zinc-700 text-zinc-200 text-sm"
                />
              </div>
            ) : (
              <>
                <p className="text-sm font-medium text-white">{p.pattern}</p>
                <p className="text-xs text-cyan-300/80 italic">
                  &ldquo;{p.example}&rdquo;
                </p>
                <p className="text-xs text-zinc-500">{p.description}</p>
              </>
            )}
          </div>
        ))}
        {(!patterns || patterns.length === 0) && !editMode && (
          <span className="text-zinc-600 text-sm">
            No patterns detected
          </span>
        )}
      </div>
    </motion.div>
  );
}

function ThingsToAvoidCard({ items, editMode, onUpdate }) {
  const [editValue, setEditValue] = useState(items?.join("\n") || "");

  useEffect(() => {
    setEditValue(items?.join("\n") || "");
  }, [items]);

  return (
    <motion.div
      variants={fadeIn}
      className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5"
    >
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-4 h-4 text-red-400" />
        <h3 className="text-sm font-medium text-white">Things to Avoid</h3>
      </div>
      {editMode ? (
        <div className="space-y-2">
          <Textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() =>
              onUpdate(
                "things_to_avoid",
                editValue.split("\n").map((s) => s.trim()).filter(Boolean)
              )
            }
            placeholder="One item per line"
            className="min-h-[120px] bg-zinc-800/50 border-zinc-700 text-zinc-200 text-sm"
          />
          <p className="text-xs text-zinc-600">One per line</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items?.map((item, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-2 text-sm"
            >
              <X className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
              <span className="text-zinc-300">{item}</span>
            </motion.li>
          ))}
          {(!items || items.length === 0) && (
            <span className="text-zinc-600 text-sm">None specified</span>
          )}
        </ul>
      )}
    </motion.div>
  );
}

function SummaryCard({ analysis }) {
  if (!analysis) return null;

  const meta = [
    analysis.formality_level && {
      label: "Formality",
      value: analysis.formality_level,
    },
    analysis.emotional_tone && {
      label: "Emotional Tone",
      value: analysis.emotional_tone,
    },
    analysis.reading_level && {
      label: "Reading Level",
      value: analysis.reading_level,
    },
  ].filter(Boolean);

  return (
    <motion.div
      variants={fadeIn}
      className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 p-5"
    >
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-cyan-400" />
        <h3 className="text-sm font-medium text-white">Voice Summary</h3>
      </div>
      {analysis.summary && (
        <p className="text-sm text-zinc-300 leading-relaxed mb-4">
          {analysis.summary}
        </p>
      )}
      {meta.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {meta.map((m) => (
            <div
              key={m.label}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50"
            >
              <span className="text-xs text-zinc-500">{m.label}</span>
              <span className="text-xs text-white font-medium capitalize">
                {m.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function VersionHistoryItem({ profile, isActive, onRestore }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors">
      <div className="flex items-center gap-3">
        <div
          className={`w-2 h-2 rounded-full ${
            isActive ? "bg-cyan-400" : "bg-zinc-600"
          }`}
        />
        <div>
          <p className="text-sm text-white font-medium">
            {profile.name || "Untitled Profile"}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-zinc-500">v{profile.version}</span>
            <span className="text-xs text-zinc-600">-</span>
            <span className="text-xs text-zinc-500">
              {new Date(profile.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isActive && (
          <Badge
            variant="info"
            size="xs"
          >
            Active
          </Badge>
        )}
        {!isActive && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => onRestore(profile)}
            className="text-zinc-400 hover:text-cyan-400"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Restore
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------
export default function ReachBrandVoice() {
  const { user } = useUser();
  const companyId = user?.organization_id || user?.company_id;

  // --- Data state ---
  const [profiles, setProfiles] = useState([]);
  const [activeProfile, setActiveProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- Input state ---
  const [samples, setSamples] = useState(["", "", ""]);
  const [profileName, setProfileName] = useState("Brand Voice Profile");

  // --- Analysis state ---
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // --- Version history ---
  const [showHistory, setShowHistory] = useState(false);

  // ---------------------------------------------------------------------------
  // Fetch profiles
  // ---------------------------------------------------------------------------
  const fetchProfiles = useCallback(async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("brand_voice_profiles")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setProfiles(data || []);
      const active = data?.find((p) => p.is_active);
      if (active) {
        setActiveProfile(active);
        setAnalysis(active.full_analysis);
        setProfileName(active.name || "Brand Voice Profile");
        if (active.sample_texts?.length > 0) {
          setSamples(
            active.sample_texts.length >= 3
              ? active.sample_texts
              : [...active.sample_texts, ...Array(3 - active.sample_texts.length).fill("")]
          );
        }
      }
    } catch (err) {
      console.error("Failed to fetch brand voice profiles:", err);
      toast.error("Failed to load brand voice profiles");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  function handleSampleChange(index, value) {
    setSamples((prev) => prev.map((s, i) => (i === index ? value : s)));
  }

  function handleAddSample() {
    setSamples((prev) => [...prev, ""]);
  }

  function handleRemoveSample(index) {
    setSamples((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAnalysisUpdate(field, value) {
    setAnalysis((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  async function handleAnalyze() {
    const filledSamples = samples.filter((s) => s.trim().length > 0);
    if (filledSamples.length === 0) {
      toast.error("Add at least one text sample to analyze");
      return;
    }

    try {
      setAnalyzing(true);
      setAnalysis(null);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reach-analyze-brand-voice`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ samples: filledSamples }),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Analysis failed (${response.status})`);
      }

      const result = await response.json();
      setAnalysis(result);
      toast.success("Brand voice analysis complete");
    } catch (err) {
      console.error("Analysis error:", err);
      toast.error(err.message || "Failed to analyze brand voice");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSaveProfile() {
    if (!analysis) {
      toast.error("Run an analysis first");
      return;
    }
    if (!companyId) {
      toast.error("No company context available");
      return;
    }

    try {
      setSaving(true);

      // Deactivate all current active profiles for this company
      const { error: deactivateError } = await supabase
        .from("brand_voice_profiles")
        .update({ is_active: false })
        .eq("company_id", companyId)
        .eq("is_active", true);

      if (deactivateError) {
        console.error("Failed to deactivate previous profiles:", deactivateError);
      }

      // Calculate next version
      const maxVersion =
        profiles.length > 0
          ? Math.max(...profiles.map((p) => p.version || 0))
          : 0;

      const filledSamples = samples.filter((s) => s.trim().length > 0);

      const newProfile = {
        company_id: companyId,
        created_by: user?.id,
        name: profileName || "Brand Voice Profile",
        tone_descriptors: analysis.tone_descriptors || [],
        vocabulary_preferences: analysis.vocabulary_preferences || {},
        sentence_patterns: analysis.sentence_patterns || [],
        things_to_avoid: analysis.things_to_avoid || [],
        sample_texts: filledSamples,
        full_analysis: analysis,
        version: maxVersion + 1,
        is_active: true,
      };

      const { data, error } = await supabase
        .from("brand_voice_profiles")
        .insert(newProfile)
        .select()
        .single();

      if (error) throw error;

      setActiveProfile(data);
      await fetchProfiles();
      setEditMode(false);
      toast.success("Brand voice profile saved and activated");
    } catch (err) {
      console.error("Save error:", err);
      toast.error(err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleRestore(profile) {
    if (!companyId) return;

    try {
      // Deactivate all
      await supabase
        .from("brand_voice_profiles")
        .update({ is_active: false })
        .eq("company_id", companyId)
        .eq("is_active", true);

      // Activate selected
      const { error } = await supabase
        .from("brand_voice_profiles")
        .update({ is_active: true })
        .eq("id", profile.id);

      if (error) throw error;

      setActiveProfile(profile);
      setAnalysis(profile.full_analysis);
      setProfileName(profile.name || "Brand Voice Profile");
      if (profile.sample_texts?.length > 0) {
        setSamples(
          profile.sample_texts.length >= 3
            ? profile.sample_texts
            : [...profile.sample_texts, ...Array(3 - profile.sample_texts.length).fill("")]
        );
      }
      await fetchProfiles();
      toast.success(`Restored "${profile.name}" as active profile`);
    } catch (err) {
      console.error("Restore error:", err);
      toast.error("Failed to restore profile");
    }
  }

  // ---------------------------------------------------------------------------
  // Computed
  // ---------------------------------------------------------------------------
  const filledCount = samples.filter((s) => s.trim().length > 0).length;
  const canAnalyze = filledCount >= 1 && !analyzing;
  const hasAnalysis = analysis !== null;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <AnalysisSkeleton />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10">
            <Volume2 className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">
              Brand Voice Trainer
            </h1>
            <p className="text-sm text-zinc-400">
              Define and maintain a consistent brand voice across content
            </p>
          </div>
        </div>
        {activeProfile && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <Check className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs text-cyan-300 font-medium">
                Active: {activeProfile.name} (v{activeProfile.version})
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Empty state */}
      {profiles.length === 0 && !hasAnalysis && !analyzing && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center min-h-[400px] rounded-2xl border border-zinc-800 bg-zinc-900/50"
        >
          <div className="text-center space-y-4 max-w-md px-6">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center">
              <Volume2 className="w-8 h-8 text-cyan-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">
              Train your brand voice
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Paste samples of your existing content (blog posts, emails,
              social captions) and our AI will extract your unique brand voice
              profile. Use it to keep all future content consistent.
            </p>
            <Button
              variant="glow"
              onClick={() =>
                document
                  .getElementById("sample-section")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              Get Started
            </Button>
          </div>
        </motion.div>
      )}

      {/* Sample Input Section */}
      <div id="sample-section" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-white">Text Samples</h2>
            <p className="text-sm text-zinc-500">
              Paste examples of your brand's writing.{" "}
              <span
                className={
                  filledCount >= 3 ? "text-cyan-400" : "text-zinc-500"
                }
              >
                {filledCount} / {samples.length} filled
              </span>
              {filledCount < 3 && (
                <span className="text-amber-400/70 ml-1">
                  (3+ recommended)
                </span>
              )}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAddSample}
            className="text-zinc-400 hover:text-cyan-400"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Sample
          </Button>
        </div>

        <AnimatePresence>
          <div className="space-y-4">
            {samples.map((sample, i) => (
              <SampleInput
                key={i}
                index={i}
                value={sample}
                onChange={handleSampleChange}
                onRemove={handleRemoveSample}
                canRemove={samples.length > 1}
              />
            ))}
          </div>
        </AnimatePresence>

        {/* Analyze Button */}
        <div className="flex items-center gap-3">
          <Button
            variant="glow"
            onClick={handleAnalyze}
            disabled={!canAnalyze}
            className="relative"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-1.5" />
                Analyze Brand Voice
              </>
            )}
          </Button>
          {filledCount < 3 && filledCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-amber-400/70">
              <AlertCircle className="w-3.5 h-3.5" />
              More samples improve accuracy
            </div>
          )}
        </div>
      </div>

      {/* Analysis Loading */}
      {analyzing && <AnalysisSkeleton />}

      {/* Analysis Results */}
      <AnimatePresence>
        {hasAnalysis && !analyzing && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Profile Name + Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-3">
                <Input
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="bg-zinc-900/50 border-zinc-800 text-white font-medium text-base w-64 focus:border-cyan-500/50"
                  placeholder="Profile name"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditMode(!editMode)}
                  className={
                    editMode
                      ? "text-cyan-400 border-cyan-500/30"
                      : "text-zinc-400"
                  }
                >
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />
                  {editMode ? "Done Editing" : "Edit"}
                </Button>
                <Button
                  variant="glow"
                  size="sm"
                  onClick={handleSaveProfile}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Save as Active Profile
                </Button>
              </div>
            </div>

            {/* Summary */}
            <SummaryCard analysis={analysis} />

            {/* Analysis Grid */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              <ToneDescriptorsCard
                descriptors={analysis.tone_descriptors}
                editMode={editMode}
                onUpdate={handleAnalysisUpdate}
              />
              <VocabularyCard
                vocabulary={analysis.vocabulary_preferences}
                editMode={editMode}
                onUpdate={handleAnalysisUpdate}
              />
              <SentencePatternsCard
                patterns={analysis.sentence_patterns}
                editMode={editMode}
                onUpdate={handleAnalysisUpdate}
              />
              <ThingsToAvoidCard
                items={analysis.things_to_avoid}
                editMode={editMode}
                onUpdate={handleAnalysisUpdate}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Version History */}
      {profiles.length > 0 && (
        <div className="space-y-3 pt-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <Clock className="w-4 h-4" />
            <span className="font-medium">
              Version History ({profiles.length})
            </span>
            {showHistory ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 overflow-hidden"
              >
                {profiles.map((profile) => (
                  <VersionHistoryItem
                    key={profile.id}
                    profile={profile}
                    isActive={profile.is_active}
                    onRestore={handleRestore}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
